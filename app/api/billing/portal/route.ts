import { currentUser } from '@/lib/auth';
import { polar, polarCustomerId } from '@/lib/polar';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  try {
    const session = await polar('customer-sessions/', { external_customer_id: polarCustomerId(user.id), return_url: new URL('/', process.env.APP_URL!).href });
    return Response.json({ url: session.customer_portal_url });
  } catch { return Response.json({ error: '구독 관리 화면을 열지 못했습니다. 구독한 계정으로 로그인했는지 확인해 주세요.' }, { status: 502 }); }
}
