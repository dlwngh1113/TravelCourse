import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import net from 'node:net';
import path from 'node:path';
import { recordStore } from '../lib/binary-records.mjs';
const directory = await mkdtemp(path.resolve('.http-test-'));
const probe = net.createServer();
await new Promise(resolve => probe.listen(0,'127.0.0.1',resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const origin = 'http://127.0.0.1:' + port, secret = 'http-test-session-secret';
const records = recordStore(directory), id = randomUUID(), privateId = randomUUID();
const item = { id, ownerId: 11, firstName: '서연', secondName: '도윤', date: '2027-05-22', time: '14:00', venue: '예식장', address: '서울', directions: '', message: '초대합니다', theme: 'linen', images: [], published: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
await records.write(id,item); await records.write(privateId,{...item,id:privateId,published:false});
const server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{windowsHide:true,stdio:'ignore',env:{...process.env,APP_URL:origin,SESSION_SECRET:secret,DATA_DRIVER:'file',INVITATION_DATA_DIR:directory,MYSQL_URL:'',TOSS_CLIENT_KEY:'',TOSS_SECRET_KEY:'',RENEWAL_SECRET:''}});
const exited = new Promise(resolve => server.once('exit',resolve));
function session() { const data=Buffer.from(JSON.stringify({id:11,login:'test',exp:Date.now()+60000})).toString('base64url');return 'ac_session='+data+'.'+createHmac('sha256',secret).update(data).digest('base64url'); }
const send=(route,method,body,cookie='')=>fetch(origin+route,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
try {
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}
  assert.ok(ready,'production server starts');
  const page=await fetch(origin+'/i/'+id);assert.equal(page.status,200);assert.match(await page.text(),/축하의 마음/);
  const route='/api/invitations/'+id+'/guestbook', entry={id:randomUUID(),name:'Guest',message:'Congratulations',password:'secret123'};
  assert.equal((await send(route,'POST',entry)).status,200);
  assert.equal((await send(route,'POST',entry)).status,200);
  const entries=await (await fetch(origin+route)).json();assert.equal(entries.length,1);assert.ok(!JSON.stringify(entries).includes('hash'));assert.ok(!JSON.stringify(entries).includes('secret123'));
  assert.equal((await send(route,'DELETE',{id:entry.id,password:'wrong'})).status,400);
  assert.equal((await send(route,'DELETE',{id:entry.id,password:entry.password})).status,200);
  await send(route,'POST',{...entry,id:randomUUID()});const again=await(await fetch(origin+route)).json();
  assert.equal((await send(route,'DELETE',{id:again[0].id,password:''},session())).status,200);
  assert.equal((await fetch(origin+'/api/invitations/'+privateId+'/guestbook')).status,404);
  assert.equal((await send('/api/invitations','POST',item,session())).status,403);
  assert.equal((await send('/api/payments/renew','POST',{})).status,401);
  assert.equal((await send('/api/payments/checkout','POST',{})).status,401);
  console.log('PASS: production HTTP routes, guestbook SSR/create/replay/password/owner deletion, private access denial, unpaid creation denial, renewal authentication.');
} finally {
  server.kill();await exited;
  assert.equal(path.dirname(directory),process.cwd());assert.ok(path.basename(directory).startsWith('.http-test-'));
  await rm(directory,{recursive:true,force:true});
}
