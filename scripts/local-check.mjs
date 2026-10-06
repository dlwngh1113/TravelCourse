import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import path from 'node:path';

const config = parseEnv(await readFile('.env.local-test', 'utf8'));
const origin = 'http://127.0.0.1:' + (process.env.LOCAL_TEST_PORT || config.PORT || 3100);
const directory = path.resolve('data/local-tests/components');
const browser = await chromium.launch({channel: 'msedge', headless: true});
const fixtures = [];
let createdId;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.getByRole('complementary', {name: '로컬 테스트 도구'}).waitFor();
  await page.getByRole('button', {name: '판매자 테스트 로그인', exact: true}).click();
  await page.waitForURL(origin + '/');
  await page.locator('.user-name').filter({hasText: 'local-seller'}).waitFor();
  await page.getByRole('button', {name: '컴포넌트 올리기', exact: true}).click();
  await page.getByPlaceholder('예: 부드럽게 눌리는 버튼').fill('Local smoke ' + randomUUID());
  await page.locator('.license-check input').check();
  const createdResponse = page.waitForResponse(r => r.url() === origin + '/api/components' && r.request().method() === 'POST');
  await page.locator('.submit-upload').click();
  const response = await createdResponse;
  assert.equal(response.status(), 201);
  const created = await response.json();
  createdId = created.id;
  assert.equal(created.ownerId, 900000001);
  await page.reload();
  await page.getByRole('button', {name: created.title, exact: true}).waitFor();

  await page.getByRole('button', {name: '구매자 테스트 로그인', exact: true}).click();
  await page.locator('.user-name').filter({hasText: 'local-buyer'}).waitFor();
  const denied = await page.request.delete(origin + '/api/components/' + createdId, {headers: {origin}});
  assert.equal(denied.status(), 403);

  // Local fixtures check source protection and mixed-record storage without charging anyone.
  const paidId = randomUUID();
  const marker = 'private-source-' + randomUUID();
  const paid = {...created, id: paidId, title: 'Local paid fixture', priceCents: 100,
    html: '<button>' + marker + '</button>', css: 'button{color:red}', sellerStripeAccountId: 'acct_local_fixture'};
  for (const [name, data] of [
    [paidId + '.json', paid],
    ['seller-' + randomUUID() + '.json', {userId: -1, stripeAccountId: 'acct_fixture'}],
  ]) {
    const target = path.join(directory, name);
    await writeFile(target, JSON.stringify(data), {flag: 'wx'});
    fixtures.push(target);
  }
  const beforePurchase = await page.request.get(origin);
  assert.equal(beforePurchase.status(), 200);
  assert.ok(!(await beforePurchase.text()).includes(marker), 'Paid source must not be in the response');
  await page.reload();
  await page.getByRole('button', {name: paid.title, exact: true}).click();
  assert.equal(await page.locator('.download-actions').getByRole('button', {name: 'CSS', exact: true}).count(), 0);
  await page.keyboard.press('Escape');

  const purchaseId = 'cs_test_local_fixture_' + randomUUID();
  const purchaseFile = path.join(directory, 'purchase-' + purchaseId + '.json');
  await writeFile(purchaseFile, JSON.stringify({
    id: purchaseId, stripeSessionId: purchaseId, componentId: paidId, buyerId: 900000002,
    sellerId: 900000001, amountCents: 100, currency: 'usd', createdAt: new Date().toISOString(),
  }), {flag: 'wx'});
  fixtures.push(purchaseFile);
  await page.reload();
  await page.getByRole('button', {name: paid.title, exact: true}).click();
  await page.locator('.download-actions').getByRole('button', {name: 'CSS', exact: true}).waitFor();
  await page.keyboard.press('Escape');
  const invalidWebhook = await page.request.post(origin + '/api/stripe/webhook', {data: {type:'checkout.session.completed'}});
  assert.equal(invalidWebhook.status(), 400);
  const crossOrigin = await page.request.post(origin + '/api/local/session', {headers:{origin: 'https://example.org'}, form:{role:'seller'}});
  assert.equal(crossOrigin.status(), 403);
  await page.getByRole('button', {name: '판매자 테스트 로그인', exact: true}).click();
  await page.locator('.user-name').filter({hasText: 'local-seller'}).waitFor();
  const removed = await page.request.delete(origin + '/api/components/' + createdId, {headers:{origin}});
  assert.equal(removed.status(), 200);
  createdId = null;
  assert.deepEqual(errors, []);
  console.log('PASS: local login, upload/reload, ownership, paid source protection, purchase fixture unlock, mixed-record storage, unsigned webhook rejection, origin check.');
  console.log('No Stripe payment was created. Real sandbox Checkout still needs Stripe keys and CLI.');
} finally {
  if (createdId) fixtures.push(path.join(directory, createdId + '.json'));
  await browser.close();
  for (const target of fixtures) await unlink(target).catch(error => {if (error.code !== 'ENOENT') throw error;});
}
