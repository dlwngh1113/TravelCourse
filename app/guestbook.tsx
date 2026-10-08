'use client';
import { useState } from 'react';
type Entry = {id:string;name:string;message:string;createdAt:string};
export default function Guestbook({id,initial,owner}:{id:string;initial:Entry[];owner:boolean}) {
 const [entries,setEntries]=useState(initial),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [requestId,setRequestId]=useState('');
 async function send(method:string,body:unknown) {
  const response=await fetch('/api/invitations/'+id+'/guestbook',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok) throw new Error(data.error); setEntries(data);
 }
 return <section className="guestbook"><h2>축하의 마음을 남겨주세요</h2><p>메시지는 청첩장을 보는 분들께 공개됩니다.</p>
 <form onSubmit={async e=>{e.preventDefault();if(busy)return;const form=e.currentTarget, data=new FormData(form);setBusy(true);try{const token=requestId||crypto.randomUUID();setRequestId(token);await send('POST',{id:token,name:data.get('name'),message:data.get('message'),password:data.get('password')});form.reset();setRequestId('');setNotice('축하 메시지를 남겼습니다.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}}>
 <label>이름<input name="name" required maxLength={60}/></label><label>축하 메시지<textarea name="message" required maxLength={1000} rows={3}/></label><label>삭제 비밀번호<input name="password" type="password" required minLength={4} maxLength={100} autoComplete="new-password"/></label><button className="w-button" disabled={busy}>축하 메시지 남기기</button></form>
 <p role="status">{notice}</p>{entries.length===0&&<p>첫 번째 축하를 남겨주세요.</p>}
 {entries.map(entry=><article key={entry.id}><strong>{entry.name}</strong><time>{new Date(entry.createdAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}</time><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{entry.message}</p><button disabled={busy} onClick={async()=>{const password=owner?'':prompt('삭제 비밀번호를 입력해 주세요.');if(password===null)return;if(owner&&!confirm('이 메시지를 삭제할까요?'))return;setBusy(true);try{await send('DELETE',{id:entry.id,password});setNotice('삭제했습니다.');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}}>삭제</button></article>)}</section>;
}
