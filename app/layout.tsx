import type { Metadata } from 'next';
import './wedding.css';
export const metadata: Metadata = { title: '우리의 날 — 두 사람의 첫 번째 초대', description: '두 사람의 이야기를 담은 모바일 청첩장. 구독으로 제작하고 소중한 분들에게 링크로 전하세요.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
