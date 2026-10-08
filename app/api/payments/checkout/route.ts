import { currentUser } from '@/lib/auth';
import { createPaymentOrder, completeSubscription, hasPaidAccess, tossConfigured } from '@/lib/payments';
export async function POST(request: Request) {
 if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({error:'잘못된 요청입니다.'},{status:403});
 const user = await currentUser(); if (!user) return Response.json({error:'로그인이 필요합니다.'},{status:401});
 if (!tossConfigured()) return Response.json({error:'자동결제 설정을 확인해 주세요.'},{status:503});
 if (await hasPaidAccess(user.id)) return Response.json({error:'이미 구독 이용 기간입니다.'},{status:409});
 try {
  const setup = await createPaymentOrder(user.id);
  if (setup.resume) { await completeSubscription(user.id,setup.setupId,setup.customerKey,''); return Response.json({completed:true}); }
  return Response.json({...setup,clientKey:process.env.TOSS_CLIENT_KEY});
 }
 catch { return Response.json({error:'구독 요청을 처리 중입니다. 잠시 후 다시 시도해 주세요.'},{status:409}); }
}
