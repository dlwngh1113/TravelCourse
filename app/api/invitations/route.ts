import { randomUUID } from 'node:crypto';
import { currentUser } from '@/lib/auth';
import { hasPaidAccess } from '@/lib/payments';
import { boundedJson } from '@/lib/request-body';
import { invitationInput } from '@/lib/invitation-input';
import { saveInvitation } from '@/lib/invitation-store';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!await hasPaidAccess(user.id)) return Response.json({ error: '청첩장 제작 이용권을 먼저 구매해 주세요.' }, { status: 403 });
  let input;
  try { input = await invitationInput(await boundedJson(request, 2000000)); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : '입력 내용을 확인해 주세요.' }, { status: 400 }); }
  const now = new Date().toISOString();
  const item = { ...input, id: randomUUID(), ownerId: user.id, createdAt: now, updatedAt: now };
  await saveInvitation(item);
  return Response.json(item, { status: 201 });
}
