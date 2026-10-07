import type { Invitation } from '@/lib/invitations';
export function Botanical() {
  return <svg viewBox="0 0 180 110" fill="none" aria-hidden="true" className="botanical"><path d="M24 100C70 70 98 65 152 16M55 78C34 70 40 52 55 65M74 67C61 47 76 33 80 56M101 49C90 27 107 16 112 34M59 78C76 89 92 82 85 73M93 55C113 66 127 56 119 48M125 35C143 43 155 32 148 25" stroke="currentColor" strokeWidth="1.2"/></svg>;
}
export default function InvitationView({ item, compact = false }: { item: Omit<Invitation, 'ownerId'>; compact?: boolean }) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(Date.parse(item.date)) ? new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Seoul' }).format(new Date(item.date + 'T12:00:00+09:00')) : '예식 날짜를 입력해 주세요';
  return <article className={'invitation theme-' + item.theme + (compact ? ' compact' : '')}>
    <div className="invite-border"><span className="invite-kicker">TOGETHER, FOREVER</span><Botanical/><h2>{item.firstName || '첫 번째 이름'}<i>&</i>{item.secondName || '두 번째 이름'}</h2><p className="invite-date">{date}<br/>{item.time || '예식 시간'}</p><span className="invite-rule"/><p className="invite-message">{item.message}</p>
      {item.images?.length > 0 && <div className="wedding-photos">{item.images.map((image,index) => <figure key={index}><img src={image.src} alt={image.caption || '웨딩 사진 ' + (index + 1)}/>{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div>}
      <section className="invite-location"><span className="invite-kicker">LOCATION</span><h3>{item.venue || '예식 장소'}</h3><p>{item.address}</p>{!compact && item.address && <a href={'https://map.naver.com/p/search/' + encodeURIComponent(item.address)} target="_blank" rel="noreferrer">지도에서 보기 ↗</a>}<p className="invite-directions">{item.directions}</p></section><p className="invite-ending">귀한 걸음으로 저희의 시작을 축복해 주세요.</p>
    </div>
  </article>;
}
