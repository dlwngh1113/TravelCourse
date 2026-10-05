'use client';
export default function ErrorPage({reset}: {reset: () => void}) {return <main className="empty"><h1>잠시 문제가 생겼어요.</h1><p>다시 시도해 주세요.</p><button className="primary" onClick={reset}>다시 시도</button></main>;}
