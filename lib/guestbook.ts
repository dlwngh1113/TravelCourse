import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readRecord, writeRecord, withRecordLock } from './repository';
type Entry = { id: string; name: string; message: string; createdAt: string; salt: string; hash: string };
const key = (id: string) => 'guestbook-' + id;
export async function listGuests(id: string) {
 const entries = await readRecord<Entry[]>(key(id)) || [];
 return entries.slice(-100).reverse().map(({salt,hash,...entry}) => entry);
}
export async function addGuest(id: string, input: Record<string, unknown>) {
 if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.id) || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 60 || typeof input.message !== 'string' || !input.message.trim() || input.message.length > 1000 || typeof input.password !== 'string' || input.password.length < 4 || input.password.length > 100) throw new Error('이름, 축하 메시지, 삭제 비밀번호(4~100자)를 확인해 주세요.');
 const salt = randomBytes(16).toString('hex'), hash = scryptSync(input.password,salt,32).toString('hex');
 const entry: Entry = {id:input.id,name:input.name.trim(),message:input.message.trim(),createdAt:new Date().toISOString(),salt,hash};
 await withRecordLock(key(id),async () => {
  const entries = await readRecord<Entry[]>(key(id)) || [];
  if (entries.some(e => e.id === entry.id)) return;
  if (entries.length >= 500) throw new Error('방명록이 가득 찼습니다.');
  entries.push(entry); await writeRecord(key(id),entries);
 });
}
export async function deleteGuest(id: string, entryId: string, password: string, owner: boolean) {
 if (password.length > 100) throw new Error('비밀번호를 확인해 주세요.');
 await withRecordLock(key(id),async () => {
  const entries = await readRecord<Entry[]>(key(id)) || [], entry = entries.find(e => e.id === entryId);
  if (!entry) return;
  if (!owner && !timingSafeEqual(scryptSync(password,entry.salt,32),Buffer.from(entry.hash,'hex'))) throw new Error('삭제 비밀번호가 일치하지 않습니다.');
  await writeRecord(key(id),entries.filter(e => e.id !== entryId));
 });
}
