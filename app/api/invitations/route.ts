import { randomUUID } from 'node:crypto';
import { currentUser } from '@/lib/auth';
import { membership } from '@/lib/polar';
import { boundedJson } from '@/lib/request-body';
import { invitationInput } from '@/lib/invitation-input';
import { saveInvitation } from '@/lib/invitation-store';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const status = await membership(user.id);
  if (!status.active) return Response.json({ error: status.unavailable ? '구독 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' : '활성 Polar 구독이 있어야 청첩장을 만들 수 있습니다.' }, { status: status.unavailable ? 503 : 403 });
  let input;
  try { input = await invitationInput(await boundedJson(request, 2000000)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '입력 내용을 확인해 주세요.' }, { status: 400 }); }
  const now = new Date().toISOString();
  const item = { ...input, id: randomUUID(), ownerId: user.id, createdAt: now, updatedAt: now };
  await saveInvitation(item);
  return Response.json(item, { status: 201 });
}
