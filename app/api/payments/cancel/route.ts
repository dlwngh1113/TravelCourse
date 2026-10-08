import { currentUser } from '@/lib/auth';
import { cancelSubscription } from '@/lib/payments';
export async function POST(request: Request) {
 if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({error:'잘못된 요청입니다.'},{status:403});
 const user = await currentUser(); if (!user) return Response.json({error:'로그인이 필요합니다.'},{status:401});
 try { await cancelSubscription(user.id); return Response.json({ok:true}); }
 catch { return Response.json({error:'미확정 결제를 확인 중입니다. 잠시 후 다시 시도해 주세요.'},{status:409}); }
}
