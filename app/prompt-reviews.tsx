'use client';
import { useEffect, useState } from 'react';
import type { Review } from '@/lib/reviews';
import { reportReasons } from '@/lib/reviews';
export default function PromptReviews({ promptId, userId, eligible }: { promptId: string; userId?: number; eligible: boolean }) {
  const [reviews, setReviews] = useState<Review[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [rating, setRating] = useState(5), [body, setBody] = useState(''), [busy, setBusy] = useState(false), [reportId, setReportId] = useState<string | null>(null);
  const [sort, setSort] = useState('newest');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/prompts/' + promptId + '/reviews', { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error('리뷰를 불러오지 못했습니다.'); return r.json(); }).then(data => {
      setReviews(data.reviews); const mine = data.reviews.find((review: Review) => review.buyerId === userId); if (mine) { setRating(mine.rating); setBody(mine.body); }
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [promptId, userId]);
  async function send(url: string, data: unknown) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error); return result;
  }
  const mine = reviews.find(review => review.buyerId === userId);
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '—';
  return <section className="reviews-panel" aria-label="구매자 리뷰"><div className="review-heading"><h3>구매자 리뷰 <span>{reviews.length}개</span></h3><strong aria-label={'평균 별점 ' + average + '점'}>★ {average} <small>/ 5</small></strong></div><p>구매가 확인된 사용자의 평가입니다. 상품당 리뷰 1개를 작성하고 수정할 수 있습니다.</p>
    {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}
    {loading ? <p>리뷰를 불러오는 중…</p> : <>
      <div className="rating-bars">{[5,4,3,2,1].map(star => <div key={star}><span>{star}점</span><meter min={0} max={Math.max(1, reviews.length)} value={reviews.filter(r => r.rating === star).length} aria-label={star + '점 리뷰 수'}/><span>{reviews.filter(r => r.rating === star).length}</span></div>)}</div>
      {eligible ? <form className="review-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try { const { review } = await send('/api/prompts/' + promptId + '/reviews', { rating, body }); setReviews([review, ...reviews.filter(r => r.id !== review.id)]); setMessage('리뷰를 저장했습니다.'); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><h4>{mine ? '내 리뷰 수정' : '리뷰 작성'}</h4><fieldset><legend>별점</legend>{[1,2,3,4,5].map(star => <label key={star}><input type="radio" name="rating" value={star} checked={rating === star} onChange={() => setRating(star)}/><span>{star} ★</span></label>)}</fieldset><label>사용 후기<textarea required maxLength={3000} rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="사용 경험을 공유해 주세요. 프롬프트 원문과 개인정보는 포함하지 마세요."/></label><button className="primary" disabled={busy}>{busy ? '저장 중…' : mine ? '리뷰 수정하기' : '리뷰 등록하기'}</button></form> : <p className="review-eligibility">{userId ? '상품을 구매한 사용자만 리뷰를 작성할 수 있습니다.' : '구매한 계정으로 로그인하면 리뷰를 작성할 수 있습니다.'}</p>}
      <label className="review-sort">리뷰 정렬 <select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">최신순</option><option value="high">높은 별점순</option><option value="low">낮은 별점순</option></select></label>
      {reviews.length === 0 && <p className="empty">아직 리뷰가 없습니다.</p>}
      {[...reviews].sort((a,b) => sort === 'high' ? b.rating - a.rating : sort === 'low' ? a.rating - b.rating : b.createdAt.localeCompare(a.createdAt)).map(review => <article className="buyer-review" key={review.id}><div><strong>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</strong><span>@{review.author} · 구매 확인</span><time>{new Date(review.updatedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}{review.updatedAt !== review.createdAt ? ' · 수정됨' : ''}</time></div><p>{review.body}</p>{review.buyerId !== userId && <button className="review-report" onClick={() => { if (!userId) { setError('신고하려면 먼저 로그인해 주세요.'); return; } setReportId(reportId === review.id ? null : review.id); }}>리뷰 신고</button>}{reportId === review.id && <form className="report-form" onSubmit={async e => { e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError(''); try { await send('/api/reviews/' + review.id + '/report', { reason: form.get('reason'), detail: form.get('detail') }); setMessage('신고가 접수되었습니다. 검토 전까지 리뷰는 유지됩니다.'); setReportId(null); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}><label>신고 사유<select name="reason">{reportReasons.map(reason => <option key={reason}>{reason}</option>)}</select></label><label>상세 내용<textarea name="detail" maxLength={1000} placeholder="기타 사유는 상세 내용을 입력해 주세요."/></label><button className="secondary" disabled={busy}>신고 접수</button><button type="button" onClick={() => setReportId(null)}>취소</button></form>}</article>)}
    </>}
  </section>;
}
