import type { Metadata } from 'next';
import './globals.css';
import './prompts.css';
import './reviews.css';
export const metadata: Metadata = { title: 'annoyingcss — 아이디어를 여는 AI 프롬프트', description: '영상, 사주, 코딩, 여행까지. 크리에이터의 AI 프롬프트와 사용 가이드를 발견하고 거래하세요.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body>{children}</body></html>; }
