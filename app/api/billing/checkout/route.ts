import { currentUser } from '@/lib/auth';
import { membership, polar, polarConfigured, polarCustomerId } from '@/lib/polar';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: 'GitHub로 먼저 로그인해 주세요.' }, { status: 401 });
  if (!polarConfigured()) return Response.json({ error: '구독 서비스 연결을 준비 중입니다.' }, { status: 503 });
  const state = await membership(user.id);
  if (state.unavailable) return Response.json({ error: '구독 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 503 });
  if (state.active) return Response.json({ error: '이미 구독 중입니다. 청첩장을 제작해 주세요.' }, { status: 409 });
  try {
    const productId = process.env.POLAR_PRODUCT_ID!.trim();
    const product = await polar('products/' + encodeURIComponent(productId));
    if (!product.is_recurring || product.is_archived) return Response.json({ error: '구독 상품 설정을 확인해 주세요.' }, { status: 503 });
    const checkout = await polar('checkouts/', { products: [productId], external_customer_id: polarCustomerId(user.id), customer_name: user.login,
      allow_trial: false, allow_discount_codes: false, success_url: new URL('/?subscription=success', process.env.APP_URL!).href, return_url: new URL('/?subscription=cancelled', process.env.APP_URL!).href });
    return Response.json({ url: checkout.url });
  } catch { return Response.json({ error: '구독 결제 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502 }); }
}
