import { currentUser } from '@/lib/auth';
import { completeSubscription } from '@/lib/payments';
export async function GET(request: Request) {
 const p = new URL(request.url).searchParams, user = await currentUser();
 const home = (state: string) => new URL('/?payment=' + state, process.env.APP_URL || request.url);
 if (!user) return Response.redirect(home('failed'));
 try { await completeSubscription(user.id,p.get('setupId') || '',p.get('customerKey') || '',p.get('authKey') || ''); return Response.redirect(home('success')); }
 catch { return Response.redirect(home('failed')); }
}
