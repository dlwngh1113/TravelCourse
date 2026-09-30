import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {title: {default: '旅途 — 探索韓國之美', template: '%s | 旅途'}, description: '透過韓國觀光公社的旅遊資訊，探索韓國景點、文化、美食與住宿。'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="zh-Hant"><body><a className="skip" href="#main">跳至主要內容</a><header className="header"><Link href="/" className="logo">旅<span>旅途</span><small>探索韓國之美</small></Link><nav aria-label="主要選單"><Link href="/#explore">探索景點</Link><Link href="/?type=85#explore">節慶與文化</Link><Link href="/?type=80#explore">住宿推薦</Link></nav><span className="language">繁體中文 <span> / 韓國旅遊</span></span></header>{children}<footer><Link href="/" className="logo">旅<span>旅途</span></Link><p>新的風景，專屬於你的旅途。<br/>旅遊資訊提供：韓國觀光公社 · 繁體中文服務</p><span>© {new Date().getFullYear()} 韓國旅途<br/>圖片版權歸各權利人所有。</span></footer></body></html>;
}
