import 'server-only';
import path from 'node:path';
import { PromptItem, seeds } from './prompts';
import { recordStore } from './binary-records.mjs';
import type { Review } from './reviews';
const records = recordStore(path.resolve(process.env.DATA_DIR || './data/components'));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function listPrompts(): Promise<PromptItem[]> {
  const names = await records.names();
  const items = await Promise.all(names.filter(name => uuid.test(name)).map(name => records.read(name)));
  return [...items.filter((item): item is PromptItem => item?.kind === 'prompt').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), ...seeds];
}
export async function savePrompt(item: PromptItem) { await records.migrate(); await records.write(item.id, item); }
export async function getPrompt(id: string): Promise<PromptItem | null> {
  const seed = seeds.find(item => item.id === id);
  if (seed) return seed;
  if (!uuid.test(id)) return null;
  const item = await records.read(id);
  return item?.kind === 'prompt' ? item : null;
}
export async function removePrompt(id: string, ownerId: number) {
  const item = await getPrompt(id);
  if (!item || item.deletedAt) return 'missing';
  if (item.ownerId !== ownerId) return 'forbidden';
  await savePrompt({ ...item, deletedAt: new Date().toISOString() });
  return 'deleted';
}
export type Purchase = { id: string; componentId?: string; promptId?: string; buyerId: number; sellerId?: number; amountCents: number; currency: 'usd'; stripeSessionId: string; createdAt: string };
export async function saveSeller(userId: number, stripeAccountId: string) { await records.migrate(); await records.write(`seller-${userId}`, { userId, stripeAccountId }); }
export async function getSeller(userId: number): Promise<{ userId: number; stripeAccountId: string } | null> { return records.read(`seller-${userId}`); }
export async function savePurchase(purchase: Purchase) { await records.migrate(); await records.write(`purchase-${purchase.stripeSessionId}`, purchase); }
export async function purchasedIds(buyerId: number): Promise<string[]> {
  const names = await records.names();
  const items: Purchase[] = await Promise.all(names.filter(name => name.startsWith('purchase-')).map(name => records.read(name)));
  return items.filter(item => item?.buyerId === buyerId).map(item => item.promptId || item.componentId || '').filter(Boolean);
}
export async function hasPurchase(buyerId: number, id: string) { return (await purchasedIds(buyerId)).includes(id); }
export async function listReviews(promptId: string): Promise<Review[]> {
  const names = await records.names();
  const rows: Review[] = await Promise.all(names.filter(name => name.startsWith('review-' + promptId + '-')).map(name => records.read(name)));
  return rows.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function saveReview(review: Review) { await records.write('review-' + review.id, review); }
export async function getReview(id: string): Promise<Review | null> { return /^[a-zA-Z0-9-]+$/.test(id) ? records.read('review-' + id) : null; }
export async function reportReview(review: Review, reporterId: number, reason: string, detail: string) {
  const id = 'report-' + review.id + '-' + reporterId;
  // Stable name gives each reporter one report per review.
  const existing = await records.read(id);
  if (existing) return false;
  await records.write(id, { reviewId: review.id, promptId: review.promptId, reporterId, reason, detail, reviewSnapshot: review, status: 'pending', createdAt: new Date().toISOString() });
  return true;
}
