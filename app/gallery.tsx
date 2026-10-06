"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { categories, PromptItem, licenseText } from '@/lib/prompts';
import PromptReviews from './prompt-reviews';
import ImageEditor, { DescriptionImage } from './image-editor';
import type { User } from '@/lib/auth';

const symbols: Record<string, string> = { '전체': '✳', '영상': '▷', '사주': '☯', '코딩': '</>', '여행 코스': '↗', '이미지': '◈', '글쓰기': '¶', '마케팅': '◎', '업무 생산성': '✓' };
const price = (item: PromptItem) => item.priceCents ? '$' + (item.priceCents / 100).toFixed(2) : '무료';

function Modal({ title, children, close, wide = false }: { title: string; children: React.ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, []);
  return <dialog ref={ref} className={'modal' + (wide ? ' wide' : '')} aria-label={title} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="modal-head"><h2>{title}</h2><button className="close" onClick={close} aria-label="닫기">×</button></div>{children}
  </dialog>;
}
function download(item: PromptItem) {
  if (item.previewLocked) return;
  const content = [item.title, 'by ' + item.author, '', '[프롬프트]', item.prompt, '', '[사용 방법]', item.instructions, '', '[권장 AI]', item.model, '', '[라이선스]', licenseText].join('\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = item.id + '.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function request(url: string, body?: unknown, method = 'POST') {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '요청을 처리하지 못했습니다.');
  return data;
}
export default function Gallery({ initialItems, user, authReady, purchasedIds }: { initialItems: PromptItem[]; user: User | null; authReady: boolean; purchasedIds: string[] }) {
  const router = useRouter();
  const [images, setImages] = useState<DescriptionImage[]>([]);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editImages, setEditImages] = useState<DescriptionImage[]>([]);
  const [items, setItems] = useState(initialItems);
  const [category, setCategory] = useState('전체');
  const [view, setView] = useState<'all' | 'saved' | 'mine' | 'purchased'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('latest');
  const [saved, setSaved] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'guide' | 'prompt' | 'reviews'>('guide');
  const [modal, setModal] = useState<'upload' | 'login' | 'license' | null>(null);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [sellerNeedsAction, setSellerNeedsAction] = useState(false);
  const [error, setError] = useState('');
  const selected = items.find(item => item.id === selectedId);
  useEffect(() => { setItems(initialItems); }, [initialItems]);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem('annoyingcss-saved-prompts') || '[]'); if (Array.isArray(value)) setSaved(value.filter(id => typeof id === 'string')); } catch {}
    const params = new URLSearchParams(window.location.search);
    if (params.get('purchase') === 'success') setNotice('결제를 확인 중입니다. 구매 내역 반영까지 잠시 걸릴 수 있어요. 반영 후 구매한 프롬프트에서 확인하세요.');
    if (params.get('purchase') === 'cancelled') setNotice('결제가 취소되었습니다. 다시 구매할 수 있어요.');
    const sellerReturn = params.get('seller');
    if (sellerReturn) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('seller');
      window.history.replaceState(window.history.state, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
      if (sellerReturn === 'refresh') {
        setSellerNeedsAction(true);
        setNotice('Stripe 등록이 아직 끝나지 않았습니다. 등록 창에서 남은 항목을 완료해 주세요.');
      } else {
        setNotice('Stripe 정산 계정 연결 상태를 확인하고 있습니다.');
        void fetch('/api/sellers/status', { cache: 'no-store' }).then(async response => {
          const status = await response.json();
          if (!response.ok) throw new Error(status.error || '계정 상태를 확인하지 못했습니다.');
          if (!status.connected) {
            setSellerNeedsAction(true);
            setNotice('이 로그인 계정에는 정산 계정이 연결되어 있지 않습니다. 판매자 계정으로 다시 로그인해 연결해 주세요.');
          } else if (status.chargesEnabled && status.payoutsEnabled) {
            setSellerNeedsAction(false);
            setNotice('판매자 정산 계정 연결이 완료되었습니다. 이제 유료 프롬프트를 등록할 수 있어요.');
          } else if (status.currentlyDue > 0) {
            setSellerNeedsAction(true);
            setNotice('Stripe에서 추가 정보가 필요합니다. 판매자 등록을 다시 열어 남은 정보를 입력해 주세요.');
          } else if (status.pendingVerification > 0 || status.detailsSubmitted) {
            setSellerNeedsAction(false);
            setNotice('정보를 제출했습니다. Stripe 검토가 끝나면 유료 판매와 정산이 활성화됩니다.');
          } else {
            setSellerNeedsAction(true);
            setNotice('Stripe 등록을 마치지 못했습니다. 다시 연결해 남은 정보를 입력해 주세요.');
          }
        }).catch(error => {
          setSellerNeedsAction(true);
          setNotice(error instanceof Error ? error.message : '계정 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        });
      }
    }
    if (params.has('error')) setNotice('로그인을 완료하지 못했습니다. 다시 시도해 주세요.');
    if (params.get('purchase') !== 'success') return;
    let attempts = 0;
    const timer = setInterval(() => { router.refresh(); if (++attempts >= 10) clearInterval(timer); }, 3000);
    return () => clearInterval(timer);
  }, [router]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer); } }, [toast]);
  const changeView = (next: typeof view) => { setView(next); setCategory('전체'); };
  const upload = () => { setError(''); setImages([]); setModal(user ? 'upload' : 'login'); };
  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id];
    setSaved(next); try { localStorage.setItem('annoyingcss-saved-prompts', JSON.stringify(next)); } catch { setToast('이 브라우저에서는 저장한 목록을 유지할 수 없습니다.'); }
  };
  const open = (id: string) => { setSelectedId(id); setEditingDescription(false); setTab('guide'); };
  const perform = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch (e) { setToast(e instanceof Error ? e.message : '요청에 실패했습니다.'); } finally { setBusy(false); } };
  const checkout = (item: PromptItem) => {
    if (!user) { setSelectedId(null); setModal('login'); return; }
    void perform(async () => { const data = await request('/api/checkout', { promptId: item.id }); window.location.assign(data.url); });
  };
  const remove = (item: PromptItem) => {
    if (!confirm('이 프롬프트를 판매 목록에서 삭제할까요? 기존 구매자의 이용 권한은 유지됩니다.')) return;
    void perform(async () => { await request('/api/prompts/' + item.id, undefined, 'DELETE'); setItems(items.filter(value => value.id !== item.id)); setSelectedId(null); setToast('프롬프트를 판매 목록에서 삭제했습니다.'); router.refresh(); });
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    try {
      const item = await request('/api/prompts', {
        images, title: form.get('title'), category: form.get('category'), summary: form.get('summary'),
        model: form.get('model'), prompt: form.get('prompt'), instructions: form.get('instructions'),
        priceCents: Math.round(Number(form.get('price')) * 100), licenseAccepted: form.get('license') === 'on',
      });
      setItems([item, ...items]); setModal(null); changeView('mine'); setQuery(''); setToast('프롬프트를 등록했습니다.'); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : '등록에 실패했습니다.'); } finally { setBusy(false); }
  }
  const filtered = items.filter(item => (view === 'purchased' ? purchasedIds.includes(item.id) : !item.deletedAt) &&
    (view !== 'mine' || item.ownerId === user?.id && Boolean(user)) &&
    (view !== 'saved' || saved.includes(item.id)) &&
    (category === '전체' || item.category === category) &&
    (item.title + ' ' + item.summary + ' ' + item.model + ' ' + item.author).toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => sort === 'low' ? a.priceCents - b.priceCents : sort === 'high' ? b.priceCents - a.priceCents : b.createdAt.localeCompare(a.createdAt));
  return <>
    <header className="header">
      <a href="/" className="brand" aria-label="annoyingcss 홈"><span className="brand-icon">✳</span>annoying<span className="brand-css">css</span><small className="beta-label">PROMPTS</small></a>
      <nav aria-label="주 메뉴"><button className={view === 'all' ? 'nav-active' : ''} onClick={() => changeView('all')}>프롬프트 탐색</button><button className={view === 'saved' ? 'nav-active' : ''} onClick={() => changeView('saved')}>저장한 목록</button></nav>
      <div className="header-actions">{user ? <><span className="user-name">@{user.login}</span><button className="login-button" onClick={() => void perform(async () => { await request('/api/auth/logout'); window.location.reload(); })}>로그아웃</button></> : <button className="login-button" onClick={() => setModal('login')}>GitHub 로그인 ↗</button>}<button className="primary upload-top" onClick={upload}>＋ 프롬프트 올리기</button></div>
    </header>
    <main id="main">
      <section className="hero prompt-hero">
        <div className="hero-copy"><div className="eyebrow">SMALL PROMPTS. BIG POSSIBILITIES.</div><h1>더 좋은 답변은,<br/><span>더 좋은 프롬프트에서.</span></h1><p>누군가의 노하우가 당신의 새로운 시작이 되도록.<br/>영상부터 코딩, 여행까지. 다음 아이디어를 발견하세요.</p><a className="hero-link" href="#prompts">나에게 맞는 프롬프트 찾기 <span>↗</span></a><div className="hero-pills"><span>✳ 크리에이터의 노하우</span><span>↗ 바로 쓰는 사용 가이드</span><span>♡ 무료부터 시작</span></div></div>
        <div className="prompt-art" aria-hidden="true"><span className="art-orbit">✳</span><div className="prompt-art-card"><div className="art-card-top"><span>YOUR NEXT GREAT IDEA</span><span>↗</span></div><div className="art-prompt-line">주말 이틀, 나만의 여행을</div><div className="art-prompt-line">계획해줘 <span className="cursor">▍</span></div><div className="art-response"><span>✦</span><p>취향을 더하면,<br/><strong>가능성은 무한해지니까.</strong></p></div><div className="art-card-bottom"><span>아이디어 + 프롬프트</span><span>→</span></div></div><span className="art-tag tag-one">VIDEO ↗</span><span className="art-tag tag-two">&lt;/&gt; CODE</span><span className="art-tag tag-three">TRAVEL ✧</span></div>
      </section>
      {notice && <div className="market-notice" role="status">{notice}{sellerNeedsAction && <button onClick={upload}>판매자 등록 이어 하기 ↗</button>}<button onClick={() => { changeView('purchased'); router.refresh(); }}>구매 내역 새로고침 ↻</button><button aria-label="안내 닫기" onClick={() => setNotice('')}>×</button></div>}
      <section id="prompts" className="library">
        <aside className="sidebar"><div className="side-title">EXPLORE BY CATEGORY</div><div className="category-list">{categories.map(name => <button key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}><span className="category-icon">{symbols[name]}</span>{name}<span className="category-count">{items.filter(item => !item.deletedAt && (name === '전체' || item.category === name)).length}</span></button>)}</div><div className="side-divider"/><button className={'my-components ' + (view === 'mine' ? 'active' : '')} onClick={() => user ? changeView('mine') : setModal('login')}>↗ 내가 올린 프롬프트</button><button className={'my-components ' + (view === 'purchased' ? 'active' : '')} onClick={() => user ? changeView('purchased') : setModal('login')}>◇ 구매한 프롬프트</button><div className="contribute"><span className="contribute-star">✳</span><h3>당신만의 한 문장</h3><p>좋은 결과를 만든 프롬프트,<br/>다른 사람과 나누어 보세요.</p><button onClick={upload}>크리에이터로 시작하기 ↗</button></div></aside>
        <div className="collection"><div className="collection-heading"><div><span className="section-eyebrow">THE PROMPT COLLECTION</span><h2>{view === 'saved' ? '저장한 프롬프트' : view === 'mine' ? '내가 올린 프롬프트' : view === 'purchased' ? '구매한 프롬프트' : category === '전체' ? '작은 문장, 새로운 가능성' : category + ' 프롬프트'}</h2></div><span className="live-label">✦ MADE BY PEOPLE</span></div>
          <div className="toolbar"><label className="search"><span>⌕</span><input aria-label="프롬프트 검색" placeholder="어떤 아이디어를 찾고 있나요?" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="정렬" value={sort} onChange={e => setSort(e.target.value)}><option value="latest">최신순</option><option value="low">낮은 가격순</option><option value="high">높은 가격순</option></select></div>
          <div className="collection-note"><span>{filtered.length}개의 프롬프트</span><span>나만의 방식으로, 더 쉽게.</span></div>
          <div className="component-grid">{filtered.map(item => <article className="component-card" key={item.id} data-prompt-id={item.id}>
            <div className="card-preview prompt-preview" style={{ background: item.color }}><span className="preview-category">{item.category}</span><button className={'save-button' + (saved.includes(item.id) ? ' saved' : '')} onClick={() => toggleSaved(item.id)} aria-label={item.title + (saved.includes(item.id) ? ' 저장 취소' : ' 저장')} aria-pressed={saved.includes(item.id)}>♡</button><button className="prompt-card-open" onClick={() => open(item.id)} aria-label={item.title + ' 자세히 보기'}><span className="prompt-symbol">{symbols[item.category]}</span><span className="prompt-model">{item.model}</span><span className="prompt-open-label">프롬프트 살펴보기 ↗</span></button></div>
            <div className="card-info"><button className="card-title" onClick={() => open(item.id)}>{item.title}</button><p className="prompt-summary">{item.summary}</p><div className="card-meta"><span className="author"><span className="avatar" style={{ background: item.color }}>{item.author.slice(0, 1).toUpperCase()}</span>{item.author}</span><span className="prompt-price">{purchasedIds.includes(item.id) ? '구매 완료' : price(item)}</span></div>{item.ownerId === user?.id && user && <button className="card-delete" disabled={busy} onClick={() => remove(item)} aria-label={item.title + ' 삭제'}>삭제</button>}{item.deletedAt && <small>판매 종료 · 구매자 이용 가능</small>}</div>
          </article>)}</div>
          {filtered.length === 0 && <div className="empty"><h3>아직 프롬프트가 없어요.</h3><p>다른 카테고리나 검색어를 선택해 보세요.</p><button className="secondary" onClick={() => { setCategory('전체'); setQuery(''); changeView('all'); }}>전체 둘러보기</button></div>}
          <div className="collection-end">✳ 한 줄의 아이디어가, 또 다른 가능성으로.</div>
        </div>
      </section>
      <section className="bottom-banner"><div><span>FROM YOUR MIND, TO THE WORLD</span><h2>잘 통하는 프롬프트, 혼자 쓰기 아깝다면.</h2><p>무료로 나누거나 $1,000까지 가격을 정하세요. 플랫폼 수수료는 판매 금액의 5%입니다.</p></div><button className="primary" onClick={upload}>프롬프트 공유하기 ↗</button></section>
    </main>
    <footer><a className="footer-brand" href="/">annoying<span className="brand-css">css</span></a><span>아이디어를 여는 AI 프롬프트 마켓</span><button onClick={() => setModal('license')}>라이선스 · 판매 수수료</button><span>작은 문장으로 만드는 큰 변화.</span></footer>
    {selected && <Modal title={selected.title} close={() => setSelectedId(null)} wide><p className="detail-meta">{selected.category} · {selected.model} · @{selected.author} · {price(selected)}</p><p className="detail-summary">{selected.summary}</p><div className="detail-tabs"><button className={tab === 'guide' ? 'active' : ''} onClick={() => setTab('guide')}>사용 방법</button><button className={tab === 'prompt' ? 'active' : ''} onClick={() => setTab('prompt')}>프롬프트 {selected.previewLocked ? '🔒' : ''}</button><button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>리뷰 · 별점</button></div>
      {tab === 'reviews' ? <PromptReviews key={selected.id} promptId={selected.id} userId={user?.id} eligible={Boolean(user && selected.ownerId !== user.id && purchasedIds.includes(selected.id))}/> : tab === 'guide' ? <div className="prompt-guide">{selected.instructions}<div className="description-images">{selected.images?.map((image, index) => <figure key={index}><img src={image.src} alt={image.caption || selected.title + ' 설명 이미지 ' + (index + 1)}/>{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>{user && selected.ownerId === user.id && !selected.deletedAt && <button className="secondary" onClick={() => { setEditImages(selected.images || []); setEditingDescription(!editingDescription); }}>설명 · 이미지 수정</button>}{editingDescription && <form className="prompt-form" onSubmit={e => { e.preventDefault(); const form = new FormData(e.currentTarget); void perform(async () => { const updated = await request('/api/prompts/' + selected.id + '/description', { instructions: form.get('instructions'), images: editImages }, 'PATCH'); setItems(items.map(item => item.id === updated.id ? updated : item)); setEditingDescription(false); setToast('설명을 수정했습니다.'); router.refresh(); }); }}><label>사용 방법 · 공개<textarea name="instructions" defaultValue={selected.instructions} required maxLength={20000}/></label><ImageEditor images={editImages} onChange={setEditImages}/><button className="primary" disabled={busy}>설명 저장</button><button type="button" onClick={() => setEditingDescription(false)}>취소</button></form>}</div> : selected.previewLocked ? <div className="purchase-lock"><h3>구매 후 전체 프롬프트를 사용할 수 있어요.</h3><p>사용 방법을 확인하고 나에게 맞는 프롬프트를 선택하세요.</p></div> : <pre className="code-block prompt-content">{selected.prompt}</pre>}
      <div className="download-actions">{selected.previewLocked ? <button className="primary" disabled={busy} onClick={() => checkout(selected)}>{price(selected)} 구매하기 ↗</button> : <><button className="primary" onClick={() => download(selected)}>프롬프트 다운로드 ↓</button><button className="secondary" onClick={() => void perform(async () => { await navigator.clipboard.writeText(selected.prompt); setToast('프롬프트를 복사했습니다.'); })}>원문 복사</button></>}<span>{selected.deletedAt ? '판매 종료 · 기존 구매자는 계속 이용할 수 있습니다.' : '원문 + 사용 가이드 · TXT'}</span></div><p className="license-note">{licenseText}</p><p className="fee-note">플랫폼 판매 수수료 5%. 판매자에게 95%가 배분됩니다. 결제 처리·환전 비용과 세금은 별도 적용될 수 있습니다.</p>
    </Modal>}
    {modal === 'login' && <Modal title="아이디어를 함께 나눠요." close={() => setModal(null)}><div className="login-content"><span className="login-mark">✳</span><p>GitHub로 로그인하고 프롬프트를<br/>구매하거나 직접 판매해 보세요.</p>{authReady ? <a className="primary" href="/api/auth/github">GitHub로 계속하기 ↗</a> : <div className="setup-notice">GitHub 로그인 설정이 필요합니다. 로컬에서는 상단의 테스트 로그인을 이용하세요.</div>}</div></Modal>}
    {modal === 'license' && <Modal title="라이선스와 판매 수수료" close={() => setModal(null)}><div className="prompt-guide"><h3>구매·사용 라이선스</h3><p>{licenseText}</p><h3>판매와 정산</h3><p>판매 가격은 $0~$1,000입니다. 무료 상품에는 수수료가 없습니다. 유료 판매 금액의 5%는 annoyingcss가 가져가며, 95%는 판매자 정산 계정으로 배분됩니다. 결제 처리·환전 비용과 세금은 별도 적용될 수 있습니다.</p><p>판매자는 직접 작성하거나 판매 권한이 있는 프롬프트만 등록해야 합니다. 판매 목록에서 삭제해도 기존 구매자의 이용 권한은 유지됩니다.</p></div></Modal>}
    {modal === 'upload' && <Modal title="당신의 노하우를 공유하세요." close={() => { if (!busy) setModal(null); }} wide><form className="upload-form prompt-form" onSubmit={submit}><p>좋은 프롬프트에 친절한 사용 방법을 더해 주세요.</p>
      <div className="form-row"><label>제목<input name="title" required maxLength={80} placeholder="예: 취향을 담은 주말 여행"/></label><label>카테고리<select name="category">{categories.slice(1).map(name => <option key={name}>{name}</option>)}</select></label></div>
      <label>한 줄 소개 · 공개<textarea name="summary" required maxLength={500} rows={2} placeholder="이 프롬프트로 무엇을 할 수 있나요?"/></label>
      <div className="form-row"><label>권장 AI / 모델<input name="model" required maxLength={80} defaultValue="텍스트 AI 공통"/></label><label>가격 (USD)<input name="price" type="number" min="0" max="1000" step="0.01" defaultValue="0" required/></label></div>
      <label>프롬프트 원문<textarea name="prompt" required maxLength={50000} rows={8} placeholder="AI에 입력할 프롬프트를 작성하세요. 바꿀 부분은 [주제]처럼 표시하면 좋아요."/></label><small>유료 프롬프트 원문은 구매자와 작성자에게만 공개됩니다.</small>
      <label>사용 방법 · 공개<textarea name="instructions" required maxLength={20000} rows={5} placeholder="1. 어떤 AI에서 사용하나요?&#10;2. 어떤 부분을 바꾸나요?&#10;3. 결과를 어떻게 활용하나요?"/></label><small>소개와 사용 방법은 구매 전에 공개됩니다. 판매할 원문을 이곳에 넣지 마세요.</small>
      <ImageEditor images={images} onChange={setImages}/>
      <div className="seller-box"><strong>유료 판매를 준비하고 있나요?</strong><p>$0~$1,000 · 판매 수수료 5%, 판매자 배분 95%. 결제 처리·환전 비용과 세금은 별도 적용될 수 있습니다.</p><button type="button" className="secondary" disabled={busy} onClick={() => void perform(async () => { const data = await request('/api/sellers/onboard'); window.location.assign(data.url); })}>판매자 정산 계정 연결 ↗</button></div>
      <p className="license-note">{licenseText}</p><label className="license-check"><input name="license" type="checkbox" required/>판매 권한을 보유하며 위 라이선스와 수수료에 동의합니다.</label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary submit-upload" disabled={busy}>{busy ? '처리 중…' : '프롬프트 등록하기 ↗'}</button>
    </form></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </>;
}
