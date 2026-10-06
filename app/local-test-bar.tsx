import { localTestingEnabled } from '@/lib/local-testing';
import type { User } from '@/lib/auth';

export default function LocalTestBar({ user }: { user: User | null }) {
  if (!localTestingEnabled()) return null;
  const ready = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  return <aside className="local-test-bar" aria-label="로컬 테스트 도구">
    <div><strong>LOCAL TEST</strong> · {user?.login || '로그아웃'}
      <small>{ready ? 'Stripe 테스트 키 설정됨 · 웹훅 리스너를 실행해 주세요.' : 'UI·업로드 테스트 가능 · 결제는 .env.local-test의 Stripe 키와 웹훅 연결이 필요합니다.'}</small>
    </div>
    <form action="/api/local/session" method="post">
      <button name="role" value="seller">판매자 테스트 로그인</button>
      <button name="role" value="buyer">구매자 테스트 로그인</button>
      <button name="role" value="logout">로그아웃</button>
    </form>
  </aside>;
}
