import { currentUser } from '@/lib/auth';
import { getSeller } from '@/lib/store';
import { paymentsConfigured, stripe } from '@/lib/stripe';

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: '판매자 상태를 확인하려면 로그인해 주세요.' }, { status: 401 });
  if (!paymentsConfigured()) return Response.json({ error: 'Stripe 결제 설정이 완료되지 않았습니다.' }, { status: 503 });
  try {
    const seller = await getSeller(user.id);
    if (!seller) return Response.json({ connected: false });
    const account = await stripe(`accounts/${encodeURIComponent(seller.stripeAccountId)}`, {}, 'GET');
    const requirements = account.requirements || {};
    return Response.json({
      connected: true,
      detailsSubmitted: account.details_submitted === true,
      chargesEnabled: account.charges_enabled === true,
      payoutsEnabled: account.payouts_enabled === true,
      currentlyDue: Array.isArray(requirements.currently_due) ? requirements.currently_due.length : 0,
      pendingVerification: Array.isArray(requirements.pending_verification) ? requirements.pending_verification.length : 0,
      disabledReason: typeof requirements.disabled_reason === 'string' ? requirements.disabled_reason : null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Stripe 계정 상태를 조회하지 못했습니다. 잠시 후 다시 확인해 주세요.' }, { status: 502 });
  }
}
