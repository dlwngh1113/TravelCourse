import 'server-only';
import { localTestingEnabled } from './local-testing';
export type Membership = { active: boolean; configured: boolean; unavailable?: boolean; renewsAt?: string; cancelAtPeriodEnd?: boolean };
export const polarConfigured = () => Boolean(process.env.POLAR_ACCESS_TOKEN?.trim() && process.env.POLAR_PRODUCT_ID?.trim());
export const polarCustomerId = (userId: number) => `github-${userId}`;
export class PolarError extends Error { constructor(public status: number) { super('구독 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); } }
export async function polar(path: string, body?: Record<string, unknown>) {
  const environment = process.env.POLAR_ENVIRONMENT || 'sandbox';
  if (!['sandbox', 'production'].includes(environment) || (localTestingEnabled() && environment !== 'sandbox')) throw new PolarError(503);
  if (!polarConfigured()) throw new PolarError(503);
  const origin = environment === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
  const response = await fetch(origin + '/v1/' + path, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN!.trim()}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new PolarError(response.status);
  return response.json();
}
export async function membership(userId: number): Promise<Membership> {
  if (!polarConfigured()) return { active: false, configured: false };
  try {
    const state = await polar(`customers/external/${encodeURIComponent(polarCustomerId(userId))}/state`);
    if (!Array.isArray(state.active_subscriptions) || state.external_id !== polarCustomerId(userId)) throw new PolarError(502);
    const subscription = state.active_subscriptions.find((sub: { product_id: string; status: string; current_period_end: string; ends_at?: string }) =>
      sub.product_id === process.env.POLAR_PRODUCT_ID?.trim() && sub.status === 'active' &&
      Date.parse(sub.current_period_end) > Date.now() && (!sub.ends_at || Date.parse(sub.ends_at) > Date.now()));
    return { active: Boolean(subscription), configured: true, ...(subscription ? { renewsAt: subscription.current_period_end, cancelAtPeriodEnd: subscription.cancel_at_period_end === true } : {}) };
  } catch (error) {
    if (error instanceof PolarError && error.status === 404) return { active: false, configured: true };
    return { active: false, configured: true, unavailable: true };
  }
}
