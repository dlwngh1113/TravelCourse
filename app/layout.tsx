import type { Metadata } from 'next';
import './wedding.css';
export const metadata: Metadata = { title: '우리의 날 — 두 사람의 첫 번째 초대', description: '두 사람의 이야기를 담은 모바일 청첩장. 월간 구독으로 만들고 방명록으로 축하를 나누세요.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
