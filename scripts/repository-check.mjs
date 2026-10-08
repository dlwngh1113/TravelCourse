import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
import * as codec from '../lib/binary-records.mjs';
const directory = await mkdtemp(path.resolve('.repository-test-'));
const env = { ...process.env };
process.env.INVITATION_DATA_DIR = directory;
let acquired = 0, released = 0, unlocks = 0;
const rows = new Map();
const connection = {
  async execute(sql, values = []) {
    if (sql.startsWith('SELECT GET_LOCK')) return [[{ acquired: 1 }], []];
    if (sql.startsWith('SELECT RELEASE_LOCK')) { unlocks++; return [[], []]; }
    if (sql.startsWith('INSERT')) { assert.ok(Buffer.isBuffer(values[1])); rows.set(values[0], values[1]); return [[], []]; }
    if (sql.startsWith('SELECT payload')) return [rows.has(values[0]) ? [{ payload: rows.get(values[0]) }] : [], []];
    if (sql.startsWith('SELECT record_key')) return [[...rows.keys()].map(record_key => ({ record_key })), []];
    throw new Error('Unexpected query');
  }, release() { released++; },
};
const file = path.resolve('lib/repository.ts'), m = new Module(file);
const dependencies = { 'server-only': {}, './binary-records.mjs': codec, './database': { mysqlPool: () => ({ getConnection: async () => { acquired++; return connection; } }) } };
const originalRequire = m.require.bind(m);
m.require = name => name in dependencies ? dependencies[name] : originalRequire(name);
try {
  m._compile(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, file);
  const repository = m.exports;
  process.env.DATA_DRIVER = 'file';
  await repository.withRecordLock('example', async () => {
    await repository.writeRecord('example', { text: '축하합니다' });
    await assert.rejects(repository.withRecordLock('example', async () => {}));
  });
  assert.deepEqual(await repository.readRecord('example'), { text: '축하합니다' });
  await assert.rejects(repository.readRecord('../escape'));
  await assert.rejects(repository.withRecordLock('example', async () => { throw new Error('failure'); }));
  await repository.withRecordLock('example', async () => {});
  process.env.DATA_DRIVER = 'mysql';
  await repository.withRecordLock('subscription-11', async () => {
    await repository.writeRecord('subscription-11', { active: true });
    assert.deepEqual(await repository.readRecord('subscription-11'), { active: true });
    assert.deepEqual(await repository.recordNames(), ['subscription-11']);
    assert.equal(acquired, 1, 'lock and queries share one pooled connection');
    assert.equal(released, 0);
  });
  assert.equal(released, 1); assert.equal(unlocks, 1);
  await assert.rejects(repository.withRecordLock('subscription-11', async () => { throw new Error('failure'); }));
  assert.equal(released, 2); assert.equal(unlocks, 2);
  console.log('PASS: file persistence and lock recovery; MySQL adapter parameterization, binary payloads and connection-scoped locks (mock connection).');
} finally {
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key]; Object.assign(process.env, env);
  assert.equal(path.dirname(directory), process.cwd()); assert.ok(path.basename(directory).startsWith('.repository-test-'));
  await rm(directory, { recursive: true, force: true });
}
