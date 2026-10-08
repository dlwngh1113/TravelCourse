import { localTestingEnabled } from '@/lib/local-testing';
import type { User } from '@/lib/auth';

export default function LocalTestBar({ user }: { user: User | null }) {
  if (!localTestingEnabled()) return null;
  return <aside className="local-test-bar" aria-label="로컬 테스트 도구"><div><strong>LOCAL · TOSS TEST</strong> · {user?.login || '로그아웃'}<small>테스트 키로 결제가 승인되어야 청첩장을 저장할 수 있습니다.</small></div><form action="/api/local/session" method="post"><button name="role" value="seller">테스트 계정 A</button><button name="role" value="buyer">테스트 계정 B</button><button name="role" value="logout">로그아웃</button></form></aside>;
}
