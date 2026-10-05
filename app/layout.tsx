import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'annoyingcss — 작지만 근사한 UI', description: '개발자가 만든 HTML과 CSS 컴포넌트를 발견하고, 다운로드하고, 공유하세요.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }

