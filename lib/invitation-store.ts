import 'server-only';
import { readRecord, writeRecord, recordNames } from './repository';
import type { Invitation } from './invitations';
const records = { read: (id: string) => readRecord<Invitation>(id), write: writeRecord, names: recordNames };
export const invitationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function getInvitation(id: string): Promise<Invitation | null> { return invitationId.test(id) ? records.read(id) : null; }
export async function myInvitations(ownerId: number): Promise<Invitation[]> {
  const items = await Promise.all((await records.names()).filter(name => invitationId.test(name)).map(name => records.read(name)));
  return items.filter((item): item is Invitation => Boolean(item && item.ownerId === ownerId && !item.deletedAt)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function saveInvitation(item: Invitation) { await records.write(item.id, item); }
