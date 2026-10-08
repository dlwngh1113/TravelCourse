import 'server-only';
import { randomUUID, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readRecord, writeRecord, recordNames, withRecordLock } from './repository';
type Charge = { id: string; amount: number; from: string; until: string; createdAt: string; status: 'pending' | 'paid'; paymentKey?: string };
type Subscription = { ownerId: number; customerKey: string; setupId: string; billing?: string; authorization?: { token: string; createdAt: string }; setupFailed?: boolean; amount: number; until?: string; cancelled: boolean; charge?: Charge; history: Charge[] };
const key = (id: number) => 'subscription-' + id;
export function tossAmount() { const n = Number(process.env.TOSS_AMOUNT_KRW || 29000); return Number.isSafeInteger(n) && n >= 100 && n <= 5000000 ? n : 0; }
export const tossConfigured = () => Boolean(process.env.TOSS_CLIENT_KEY && process.env.TOSS_SECRET_KEY && /^[a-f0-9]{64}$/i.test(process.env.BILLING_ENCRYPTION_KEY || '') && tossAmount());
function seal(value: string) {
 const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(process.env.BILLING_ENCRYPTION_KEY!, 'hex'), iv);
 const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
 return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString('base64');
}
function unseal(value: string) {
 const bytes = Buffer.from(value, 'base64'), cipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.BILLING_ENCRYPTION_KEY!, 'hex'), bytes.subarray(0, 12));
 cipher.setAuthTag(bytes.subarray(12, 28)); return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8');
}
export function nextMonth(iso: string) {
 const d = new Date(iso), day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
 const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last)); return d.toISOString();
}
async function toss(path: string, body?: unknown, idempotency?: string) {
 const response = await fetch('https://api.tosspayments.com/v1/' + path, { method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(65000), headers: { Authorization: 'Basic ' + Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64'), 'Content-Type': 'application/json', ...(idempotency ? { 'Idempotency-Key': idempotency } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
 return { ok: response.ok, status: response.status, value: await response.json() };
}
export async function paymentStatus(id: number) {
 const s = await readRecord<Subscription>(key(id));
 return { active: Boolean(s?.until && Date.parse(s.until) > Date.now()), configured: tossConfigured(), amount: s?.amount || tossAmount(), renewsAt: s?.until, cancelled: s?.cancelled || false, pending: s?.charge?.status === 'pending', subscribed: Boolean(s?.billing && !s.cancelled) };
}
export async function hasPaidAccess(id: number) { return (await paymentStatus(id)).active; }
export async function createPaymentOrder(id: number) {
 return withRecordLock(key(id), async () => {
  let s = await readRecord<Subscription>(key(id));
  if (s?.cancelled && s.until && Date.parse(s.until) > Date.now()) throw new Error('현재 이용 기간이 끝난 후 다시 구독해 주세요.');
  if (!s || (s.setupFailed && !s.billing) || (s.cancelled && s.charge?.status !== 'pending')) s = { ownerId: id, customerKey: randomUUID(), setupId: randomUUID(), amount: tossAmount(), cancelled: false, history: s?.history || [] };
  await writeRecord(key(id), s); return { setupId: s.setupId, customerKey: s.customerKey, amount: s.amount, resume: Boolean(s.billing || s.authorization) };
 });
}
async function charge(s: Subscription) {
 if (!s.billing || (s.cancelled && s.charge?.status !== 'pending')) return;
 if (s.charge?.status === 'paid' && s.until && Date.parse(s.until) > Date.now()) return;
 if (!s.charge || s.charge.status === 'paid') {
  const from = new Date(Math.max(Date.now(), Date.parse(s.until || '') || 0)).toISOString();
  s.charge = { id: 'sub-' + randomUUID(), amount: s.amount, from, until: nextMonth(from), createdAt: new Date().toISOString(), status: 'pending' };
  await writeRecord(key(s.ownerId), s);
 }
 const order = s.charge;
 let result = await toss('payments/orders/' + encodeURIComponent(order.id));
 if (!result.ok) {
  if (result.status !== 404 || result.value.code !== 'NOT_FOUND_PAYMENT') throw new Error('결제 조회를 완료하지 못했습니다. 같은 주문으로 다시 확인해 주세요.');
  if (s.cancelled) return;
  if (Date.now() - Date.parse(order.createdAt) > 14 * 86400000) throw new Error('오래된 미확정 결제입니다. 관리자 확인이 필요합니다.');
  result = await toss('billing/' + encodeURIComponent(unseal(s.billing)), { customerKey: s.customerKey, amount: order.amount, orderId: order.id, orderName: '우리의 날 월간 구독' }, order.id);
 }
 const p = result.value;
 if (!result.ok || p.status !== 'DONE' || p.orderId !== order.id || p.totalAmount !== order.amount || p.currency !== 'KRW' || typeof p.paymentKey !== 'string') throw new Error('결제를 확정하지 못했습니다. 같은 주문으로 다시 확인해 주세요.');
 order.status = 'paid'; order.paymentKey = p.paymentKey; s.until = order.until;
 if (!s.history.some(item => item.id === order.id)) s.history.push({ ...order });
 await writeRecord(key(s.ownerId), s);
}
export async function completeSubscription(id: number, setupId: string, customerKey: string, authKey: string) {
 return withRecordLock(key(id), async () => {
  const s = await readRecord<Subscription>(key(id));
  if (!s || s.setupId !== setupId || s.customerKey !== customerKey || s.cancelled) throw new Error('잘못된 구독 요청입니다.');
  if (!s.billing) {
   if (!s.authorization) {
    if (!authKey || authKey.length > 300) throw new Error('카드 인증이 필요합니다.');
    s.authorization = { token: seal(authKey), createdAt: new Date().toISOString() };
    await writeRecord(key(id), s);
   }
   if (Date.now() - Date.parse(s.authorization.createdAt) > 14 * 86400000) throw new Error('카드 등록 결과에 대한 관리자 확인이 필요합니다.');
   const result = await toss('billing/authorizations/issue', { authKey: unseal(s.authorization.token), customerKey }, 'issue-' + s.setupId);
   if (!result.ok && result.status >= 400 && result.status < 500 && ![409,429].includes(result.status)) {
    s.setupFailed = true; await writeRecord(key(id), s);
   }
   if (!result.ok || result.value.customerKey !== customerKey || typeof result.value.billingKey !== 'string') throw new Error('카드 등록을 완료하지 못했습니다.');
   s.billing = seal(result.value.billingKey); s.authorization = undefined; await writeRecord(key(id), s);
  }
  await charge(s);
 });
}
export async function cancelSubscription(id: number) {
 return withRecordLock(key(id), async () => {
  const s = await readRecord<Subscription>(key(id)); if (!s) return;
  s.cancelled = true;
  if (s.charge?.status !== 'pending') s.billing = undefined;
  await writeRecord(key(id), s);
 });
}
export async function renewSubscriptions() {
 const result = { processed: 0, failed: 0 };
 for (const name of (await recordNames()).filter(n => n.startsWith('subscription-'))) {
  try { await withRecordLock(name, async () => {
   const s = await readRecord<Subscription>(name);
   if (!s || (s.cancelled && s.charge?.status !== 'pending') || !s.billing || (s.until && Date.parse(s.until) > Date.now() && s.charge?.status !== 'pending')) return;
   await charge(s); result.processed++;
  }); } catch { result.failed++; }
 }
 return result;
}
