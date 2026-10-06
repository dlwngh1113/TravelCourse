import { currentUser } from '@/lib/auth';
import { getPrompt, hasPurchase, listReviews, saveReview, getReview } from '@/lib/store';
import { boundedJson } from '@/lib/request-body';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await getPrompt(id)) return Response.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  return Response.json({ reviews: await listReviews(id) }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const item = await getPrompt(id);
  if (!item) return Response.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  if (item.ownerId === user.id || !await hasPurchase(user.id, id)) return Response.json({ error: '이 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다.' }, { status: 403 });
  let data;
  try { data = await boundedJson(request); } catch { return Response.json({ error: '입력 내용을 확인해 주세요.' }, { status: 400 }); }
  if (!Number.isInteger(data?.rating) || data.rating < 1 || data.rating > 5 || typeof data.body !== 'string' || !data.body.trim() || data.body.length > 3000) return Response.json({ error: '별점 1~5점과 리뷰(1~3,000자)를 입력해 주세요.' }, { status: 400 });
  const reviewId = id + '-' + user.id;
  const previous = await getReview(reviewId);
  const now = new Date().toISOString();
  const review = { id: reviewId, promptId: id, buyerId: user.id, author: user.login, rating: data.rating, body: data.body.trim(), createdAt: previous?.createdAt || now, updatedAt: now };
  await saveReview(review);
  return Response.json({ review }, { status: previous ? 200 : 201 });
}
