import { gzipSync, gunzipSync } from 'node:zlib';
import { mkdir, readFile, readdir, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
const magic = Buffer.from('APM1');
const limit = 2 * 1024 * 1024;
export function encodeRecord(value) {
  const raw = Buffer.from(JSON.stringify(value), 'utf8');
  if (raw.length > limit) throw new Error('Record is too large');
  return Buffer.concat([magic, gzipSync(raw)]);
}
export function decodeRecord(bytes) {
  if (!bytes.subarray(0, 4).equals(magic)) throw new Error('Unknown record format');
  return JSON.parse(gunzipSync(bytes.subarray(4), { maxOutputLength: limit }).toString('utf8'));
}
export function recordStore(directory) {
  const target = (name, ext = 'bin') => {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Invalid record name');
    return path.join(directory, `${name}.${ext}`);
  };
  async function write(name, value) {
    await mkdir(directory, { recursive: true });
    const file = target(name), temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, encodeRecord(value), { flag: 'wx', mode: 0o600 });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  let migration;
  async function migrate() {
    if (migration) return migration;
    migration = (async () => {
      await mkdir(directory, { recursive: true });
      for (const file of await readdir(directory)) {
        if (!/^(?:[0-9a-f-]{36}|seller-[a-zA-Z0-9_-]+|purchase-[a-zA-Z0-9_-]+)\.json$/i.test(file)) continue;
        const name = file.slice(0, -5);
        let source;
        try { source = await readFile(target(name, 'json'), 'utf8'); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        const value = JSON.parse(source);
        let existing;
        try { existing = decodeRecord(await readFile(target(name))); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(value)) throw new Error(`Conflicting migration: ${name}`);
        if (existing === undefined) await write(name, value);
        const verified = decodeRecord(await readFile(target(name)));
        if (JSON.stringify(verified) !== JSON.stringify(value)) throw new Error('Migration verification failed');
        await unlink(target(name, 'json')).catch(error => { if (error.code !== 'ENOENT') throw error; });
      }
    })();
    try { await migration; } finally { migration = undefined; }
  }
  async function read(name) {
    await migrate();
    try { return decodeRecord(await readFile(target(name))); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
  async function names() {
    await migrate();
    return (await readdir(directory)).filter(name => /^[a-zA-Z0-9_-]+\.bin$/.test(name)).map(name => name.slice(0, -4));
  }
  return { read, write, names, migrate };
}
