import { currentUser } from '@/lib/auth';
import { paymentStatus } from '@/lib/payments';

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return Response.json(await paymentStatus(user.id), { headers: { 'Cache-Control': 'no-store' } });
}
