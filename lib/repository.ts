import 'server-only';
import path from 'node:path';
import { mkdir, open, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { RowDataPacket } from 'mysql2/promise';
import { recordStore, encodeRecord, decodeRecord } from './binary-records.mjs';
import { mysqlPool } from './database';

const root = path.resolve(process.env.INVITATION_DATA_DIR || './data/invitations');
const files = recordStore(root);
const mysql = () => { const driver = process.env.DATA_DRIVER || 'file'; if (!['file','mysql'].includes(driver)) throw new Error('Unknown DATA_DRIVER'); return driver === 'mysql'; };
const connections = new AsyncLocalStorage<Awaited<ReturnType<ReturnType<typeof mysqlPool>['getConnection']>>>();
async function connection() { return connections.getStore() || await mysqlPool().getConnection(); }
function release(db: Awaited<ReturnType<typeof connection>>) { if (db !== connections.getStore()) db.release(); }
const valid = (key: string) => { if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid record key'); return key; };
export async function readRecord<T>(key: string): Promise<T | null> {
  valid(key);
  if (!mysql()) return files.read(key);
  const db = await connection();
  try { const [rows] = await db.execute<RowDataPacket[]>('SELECT payload FROM app_records WHERE record_key = ?', [key]); return rows[0] ? decodeRecord(rows[0].payload) : null; } finally { release(db); }
}
export async function writeRecord(key: string, value: unknown) {
  valid(key);
  if (!mysql()) return files.write(key, value);
  const db = await connection();
  try { await db.execute('INSERT INTO app_records(record_key,payload) VALUES (?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)', [key, encodeRecord(value)]); } finally { release(db); }
}
export async function recordNames(): Promise<string[]> {
  if (!mysql()) return files.names();
  const db = await connection();
  try { const [rows] = await db.execute<RowDataPacket[]>('SELECT record_key FROM app_records'); return rows.map(row => String(row.record_key)); } finally { release(db); }
}
// Cross-process serialization. Each domain aggregate is committed in one record.
export async function withRecordLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  valid(key);
  if (mysql()) {
    const db = await mysqlPool().getConnection();
    const lock = createHash('sha256').update('ourday:' + key).digest('hex');
    try {
      const [rows] = await db.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS acquired', [lock]);
      if (Number(rows[0].acquired) !== 1) throw new Error('처리 중입니다. 잠시 후 다시 시도해 주세요.');
      try { return await connections.run(db,work); } finally { await db.execute('SELECT RELEASE_LOCK(?)', [lock]); }
    } finally { db.release(); }
  }
  await mkdir(root, { recursive: true });
  const lock = path.join(root, key + '.lock');
  const handle = await open(lock, 'wx').catch(() => { throw new Error('처리 중입니다. 잠시 후 다시 시도해 주세요.'); });
  try { return await work(); } finally { await handle.close(); await unlink(lock); }
}
