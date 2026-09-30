'use client';
export default function ErrorPage({reset}: {reset: () => void}) {return <main id="main" className="empty"><h1>暫時發生問題。</h1><p>請稍後再試。</p><button onClick={reset}>重試</button></main>;}
