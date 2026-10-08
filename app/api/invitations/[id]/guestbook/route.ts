import { getInvitation } from '@/lib/invitation-store';
import { currentUser } from '@/lib/auth';
import { boundedJson } from '@/lib/request-body';
import { addGuest, deleteGuest, listGuests } from '@/lib/guestbook';
type Context = { params: Promise<{id:string}> };
export async function GET(request: Request, context: Context) {
 const item = await getInvitation((await context.params).id);
 if (!item?.published || item.deletedAt) return Response.json({error:'청첩장을 찾을 수 없습니다.'},{status:404});
 return Response.json(await listGuests(item.id),{headers:{'Cache-Control':'no-store'}});
}
async function mutate(request: Request, context: Context, remove: boolean) {
 if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({error:'잘못된 요청입니다.'},{status:403});
 const item = await getInvitation((await context.params).id);
 if (!item?.published || item.deletedAt) return Response.json({error:'청첩장을 찾을 수 없습니다.'},{status:404});
 try {
  const input = await boundedJson(request,8000);
  if (!input || typeof input !== 'object') throw new Error('입력을 확인해 주세요.');
  if (remove) {
   if (typeof input.id !== 'string' || typeof input.password !== 'string') throw new Error('입력을 확인해 주세요.');
   await deleteGuest(item.id,input.id,input.password,(await currentUser())?.id === item.ownerId);
  } else await addGuest(item.id,input);
  return Response.json(await listGuests(item.id));
 } catch (e) { return Response.json({error:e instanceof Error ? e.message : '방명록을 저장하지 못했습니다.'},{status:400}); }
}
export const POST = (request: Request, context: Context) => mutate(request,context,false);
export const DELETE = (request: Request, context: Context) => mutate(request,context,true);
