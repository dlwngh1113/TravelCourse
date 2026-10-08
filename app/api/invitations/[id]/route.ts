import { currentUser } from '@/lib/auth';
import { hasPaidAccess } from '@/lib/payments';
import { boundedJson } from '@/lib/request-body';
import { invitationInput } from '@/lib/invitation-input';
import { getInvitation, saveInvitation } from '@/lib/invitation-store';

async function owner(request: Request, id: string) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return { error: Response.json({ error: '잘못된 요청입니다.' }, { status: 403 }) };
  const user = await currentUser();
  if (!user) return { error: Response.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  const item = await getInvitation(id);
  if (!item || item.deletedAt || item.ownerId !== user.id) return { error: Response.json({ error: '청첩장을 찾을 수 없습니다.' }, { status: 404 }) };
  return { user, item };
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await owner(request, (await params).id);
  if (result.error) return result.error;
  if (!await hasPaidAccess(result.user!.id)) return Response.json({ error: '청첩장 제작 이용권이 필요합니다.' }, { status: 403 });
  let input;
  try { input = await invitationInput(await boundedJson(request, 2000000)); }
  catch { return Response.json({ error: '청첩장 입력 내용을 확인해 주세요.' }, { status: 400 }); }
  const item = { ...result.item!, ...input, updatedAt: new Date().toISOString() };
  await saveInvitation(item);
  return Response.json(item);
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await owner(request, (await params).id);
  if (result.error) return result.error;
  await saveInvitation({ ...result.item!, published: false, deletedAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
