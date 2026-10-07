import { currentUser } from '@/lib/auth';
import { membership } from '@/lib/polar';
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const status = await membership(user.id);
  return Response.json(status, { status: status.unavailable ? 503 : 200, headers: { 'Cache-Control': 'no-store' } });
}
