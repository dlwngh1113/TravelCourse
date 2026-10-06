import { currentUser } from '@/lib/auth';
import { getReview, reportReview } from '@/lib/store';
import { reportReasons } from '@/lib/reviews';
import { boundedJson } from '@/lib/request-body';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: '신고하려면 로그인해 주세요.' }, { status: 401 });
  const review = await getReview((await params).id);
  if (!review) return Response.json({ error: '리뷰를 찾을 수 없습니다.' }, { status: 404 });
  if (review.buyerId === user.id) return Response.json({ error: '본인 리뷰는 신고할 수 없습니다.' }, { status: 403 });
  let data;
  try { data = await boundedJson(request); } catch { return Response.json({ error: '입력 내용을 확인해 주세요.' }, { status: 400 }); }
  if (!reportReasons.includes(data?.reason) || typeof data.detail !== 'string' || data.detail.length > 1000 || (data.reason === '기타' && !data.detail.trim())) return Response.json({ error: '신고 사유와 상세 내용(1,000자 이하)을 확인해 주세요.' }, { status: 400 });
  const created = await reportReview(review, user.id, data.reason, data.detail.trim());
  return Response.json(created ? { ok: true } : { error: '이미 신고한 리뷰입니다.' }, { status: created ? 201 : 409 });
}
