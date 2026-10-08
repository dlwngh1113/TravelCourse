import { timingSafeEqual } from 'node:crypto';
import { renewSubscriptions } from '@/lib/payments';
export async function POST(request: Request) {
 const expected = Buffer.from('Bearer ' + (process.env.RENEWAL_SECRET || ''));
 const actual = Buffer.from(request.headers.get('authorization') || '');
 if (!process.env.RENEWAL_SECRET || expected.length !== actual.length || !timingSafeEqual(expected,actual)) return Response.json({error:'Unauthorized'},{status:401});
 const result = await renewSubscriptions();
 return Response.json(result,{status:result.failed ? 503 : 200});
}
