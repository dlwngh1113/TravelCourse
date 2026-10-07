import 'server-only';
import path from 'node:path';
import { recordStore } from './binary-records.mjs';
import type { Invitation } from './invitations';
const records = recordStore(path.resolve(process.env.INVITATION_DATA_DIR || './data/invitations'));
export const invitationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function getInvitation(id: string): Promise<Invitation | null> { return invitationId.test(id) ? records.read(id) : null; }
export async function myInvitations(ownerId: number): Promise<Invitation[]> {
  const items: Invitation[] = await Promise.all((await records.names()).filter(name => invitationId.test(name)).map(name => records.read(name)));
  return items.filter(item => item && item.ownerId === ownerId && !item.deletedAt).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function saveInvitation(item: Invitation) { await records.write(item.id, item); }
