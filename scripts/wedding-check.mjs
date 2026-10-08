import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import ts from 'typescript';
function load(file,deps) { const m=new Module(path.resolve(file));const req=m.require.bind(m);m.require=n=>n in deps?deps[n]:req(n);m._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,path.resolve(file));return m.exports; }
const data=new Map(), locks=new Set();let failCommit=false, failBillingSave=false, failLookup=false;
const repo={readRecord:async k=>structuredClone(data.get(k)||null),writeRecord:async(k,v)=>{if(failBillingSave&&v.billing&&!v.charge){failBillingSave=false;throw new Error('billing write failure');}if(failCommit&&v.charge?.status==='paid'){failCommit=false;throw new Error('disk failure');}data.set(k,structuredClone(v));},recordNames:async()=>[...data.keys()],withRecordLock:async(k,fn)=>{if(locks.has(k))throw new Error('busy');locks.add(k);try{return await fn();}finally{locks.delete(k);}}};
const env={...process.env}, originalFetch=globalThis.fetch;
process.env.BILLING_ENCRYPTION_KEY='a'.repeat(64);process.env.TOSS_SECRET_KEY='test_sk';process.env.TOSS_CLIENT_KEY='test_ck';process.env.TOSS_AMOUNT_KRW='1000';
let issue=0, charges=0;const upstream=new Map(), authorizationRequests=[];
globalThis.fetch=async(url,options)=>{
 const body=options.body?JSON.parse(options.body):null;
 if(url.endsWith('authorizations/issue')){issue++;authorizationRequests.push(body.authKey);return Response.json({customerKey:body.customerKey,billingKey:'secret-billing-key'});}
 if(url.includes('payments/orders/')){if(failLookup){failLookup=false;throw new Error('timeout');}const id=url.split('/').pop();return upstream.has(id)?Response.json(upstream.get(id)):Response.json({code:'NOT_FOUND_PAYMENT'},{status:404});}
 assert.ok(url.includes('/billing/'));assert.equal(options.headers['Idempotency-Key'],body.orderId);
 if(!upstream.has(body.orderId)){charges++;upstream.set(body.orderId,{orderId:body.orderId,status:'DONE',totalAmount:body.amount,currency:'KRW',paymentKey:'paid-'+charges});}
 return Response.json(upstream.get(body.orderId));
};
try {
 const p=load('lib/payments.ts',{'server-only':{},'./repository':repo});
 const order=await p.createPaymentOrder(11);assert.deepEqual(await p.createPaymentOrder(11),order);
 assert.equal((await p.paymentStatus(11)).active,false);
 await assert.rejects(p.completeSubscription(99,order.setupId,order.customerKey,'auth'));
 failCommit=true;await assert.rejects(p.completeSubscription(11,order.setupId,order.customerKey,'auth'));
 assert.equal(charges,1);assert.equal((await p.paymentStatus(11)).active,false);
 await p.completeSubscription(11,order.setupId,order.customerKey,'auth');
 await p.completeSubscription(11,order.setupId,order.customerKey,'auth');
 assert.equal(charges,1);assert.equal(issue,1);assert.equal((await p.paymentStatus(11)).active,true);
 assert.ok(!JSON.stringify([...data.values()]).includes('secret-billing-key'));
 assert.equal(p.nextMonth('2028-01-31T12:00:00.000Z'),'2028-02-29T12:00:00.000Z');
 const s=data.get('subscription-11');s.until='2020-01-01T00:00:00Z';await p.renewSubscriptions();assert.equal(charges,2);
 await p.renewSubscriptions();assert.equal(charges,2);
 await p.cancelSubscription(11);assert.equal((await p.paymentStatus(11)).cancelled,true);assert.equal((await p.paymentStatus(11)).active,true);
 data.get('subscription-11').until='2020-01-01T00:00:00Z';await p.renewSubscriptions();assert.equal(charges,2);
 const retry=await p.createPaymentOrder(31);failBillingSave=true;
 await assert.rejects(p.completeSubscription(31,retry.setupId,retry.customerKey,'original-auth'));
 await p.completeSubscription(31,retry.setupId,retry.customerKey,'different-auth');
 assert.deepEqual(authorizationRequests.slice(-2),['original-auth','original-auth']);
 assert.equal(charges,3);
 const concurrent=await p.createPaymentOrder(44);
 const outcomes=await Promise.allSettled([p.completeSubscription(44,concurrent.setupId,concurrent.customerKey,'auth'),p.completeSubscription(44,concurrent.setupId,concurrent.customerKey,'auth')]);
 assert.equal(outcomes.filter(o=>o.status==='fulfilled').length,1);assert.equal(charges,4);
 const cancelled=await p.createPaymentOrder(66);failLookup=true;
 await assert.rejects(p.completeSubscription(66,cancelled.setupId,cancelled.customerKey,'auth'));
 await p.cancelSubscription(66);await p.renewSubscriptions();assert.equal(charges,4);assert.equal((await p.paymentStatus(66)).active,false);
 const g=load('lib/guestbook.ts',{'server-only':{},'./repository':repo});
 const entry={id:'12345678-1234-1234-1234-123456789012',name:'Guest',message:'Congratulations',password:'pass1234'};
 await g.addGuest('invite',entry);await g.addGuest('invite',entry);
 const list=await g.listGuests('invite');assert.equal(list.length,1);assert.ok(!('hash' in list[0]));assert.ok(!('salt' in list[0]));
 await assert.rejects(g.deleteGuest('invite',entry.id,'wrong',false));await g.deleteGuest('invite',entry.id,'pass1234',false);assert.equal((await g.listGuests('invite')).length,0);
 await g.addGuest('invite',entry);await g.deleteGuest('invite',entry.id,'',true);
 console.log('PASS: subscription setup reuse, ownership, replay, paid-write failure recovery without double charge, monthly renewal, cancellation, encrypted billing key, guestbook idempotency and password/owner deletion. No network or charges.');
} finally {globalThis.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in env))delete process.env[k];Object.assign(process.env,env);}
