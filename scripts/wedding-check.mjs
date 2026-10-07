import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import Module from 'node:module';
import ts from 'typescript';
import { recordStore } from '../lib/binary-records.mjs';

// Compile the actual route sources and inject boundary dependencies only.
function load(file, dependencies) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = new Module(path.resolve(file));
  const realRequire = module.require.bind(module);
  module.require = name => name in dependencies ? dependencies[name] : realRequire(name);
  module._compile(code, path.resolve(file));
  return module.exports;
}
const env = { ...process.env }, originalFetch = globalThis.fetch;
let user = { id: 11, login: 'test' }, upstreamStatus = 200;
let upstream = { external_id: 'github-11', active_subscriptions: [] };
process.env.APP_URL = 'http://localhost:3100';
process.env.POLAR_ACCESS_TOKEN = 'test-token';
process.env.POLAR_PRODUCT_ID = 'wedding-plan';
process.env.POLAR_ENVIRONMENT = 'sandbox';
globalThis.fetch = async (url, options) => {
  assert.ok(String(url).startsWith('https://sandbox-api.polar.sh/v1/'));
  assert.equal(options.cache, 'no-store');
  return Response.json(upstream, { status: upstreamStatus });
};
const polar = load('lib/polar.ts', { 'server-only': {}, './local-testing': { localTestingEnabled: () => true } });
const active = () => ({ product_id: 'wedding-plan', status: 'active', current_period_end: new Date(Date.now() + 86400000).toISOString(), cancel_at_period_end: false });
const request = (method, body, origin = 'http://localhost:3100') => new Request('http://localhost:3100/api/invitations', { method, headers: { origin, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
const scratch = await mkdtemp(path.resolve('.wedding-test-'));
const records = recordStore(scratch);
try {
  assert.equal((await polar.membership(11)).active, false);
  upstream.active_subscriptions = [active()]; assert.equal((await polar.membership(11)).active, true);
  upstream.active_subscriptions[0].product_id = 'other-plan'; assert.equal((await polar.membership(11)).active, false);
  upstream.active_subscriptions = [{ ...active(), status: 'trialing' }]; assert.equal((await polar.membership(11)).active, false);
  upstream.active_subscriptions = [{ ...active(), status: 'past_due' }]; assert.equal((await polar.membership(11)).active, false);
  upstream.active_subscriptions = [{ ...active(), current_period_end: '2000-01-01T00:00:00Z' }]; assert.equal((await polar.membership(11)).active, false);
  upstream.active_subscriptions = [{ ...active(), cancel_at_period_end: true }]; assert.equal((await polar.membership(11)).active, true);
  upstream.external_id = 'github-99'; assert.equal((await polar.membership(11)).active, false); upstream.external_id = 'github-11';
  upstreamStatus = 503; assert.equal((await polar.membership(11)).unavailable, true); upstreamStatus = 200;
  const input = load('lib/invitation-input.ts', { './prompt-images': { validateImages: async value => value || [] } });
  const common = { '@/lib/auth': { currentUser: async () => user }, '@/lib/polar': polar,
    '@/lib/request-body': load('lib/request-body.ts', {}), '@/lib/invitation-input': input,
    '@/lib/invitation-store': { getInvitation: id => records.read(id), saveInvitation: item => records.write(item.id, item) } };
  const create = load('app/api/invitations/route.ts', common);
  const edit = load('app/api/invitations/[id]/route.ts', common);
  const body = { ownerId: 999, id: 'attacker', firstName: '서연', secondName: '도윤', date: '2027-05-22', time: '14:00', venue: '예식장', address: '서울', directions: '', message: '초대합니다.', theme: 'linen', images: [], published: false };
  assert.equal((await create.POST(request('POST', body, 'https://evil.example'))).status, 403);
  user = null; assert.equal((await create.POST(request('POST', body))).status, 401); user = { id: 11, login: 'test' };
  upstream.active_subscriptions = []; assert.equal((await create.POST(request('POST', body))).status, 403);
  upstream.active_subscriptions = [active()];
  assert.equal((await create.POST(request('POST', { ...body, date: '2027-02-30' }))).status, 400);
  const response = await create.POST(request('POST', body)); assert.equal(response.status, 201);
  const item = await response.json(); assert.equal(item.ownerId, 11); assert.notEqual(item.id, body.id);
  const context = { params: Promise.resolve({ id: item.id }) };
  user = { id: 99, login: 'other' }; assert.equal((await edit.PATCH(request('PATCH', body), context)).status, 404); assert.equal((await edit.DELETE(request('DELETE'), context)).status, 404);
  user = { id: 11, login: 'test' }; upstream.active_subscriptions = [];
  assert.equal((await edit.PATCH(request('PATCH', body), context)).status, 403);
  upstream.active_subscriptions = [active()]; assert.equal((await edit.PATCH(request('PATCH', { ...body, published: true }), context)).status, 200);
  assert.equal((await records.read(item.id)).published, true);
  upstream.active_subscriptions = []; assert.equal((await edit.DELETE(request('DELETE'), context)).status, 200);
  assert.equal((await records.read(item.id)).published, false);
  console.log('PASS: subscription/product/expiry checks, failed-lookup denial, CSRF, ownership, paid-only create/edit, cancel-period access, deletion without subscription, compressed persistence. No external charges.');
} finally {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key]; Object.assign(process.env, env);
  // Only the exact temporary directory created for these isolated tests is removed.
  assert.ok(path.basename(scratch).startsWith('.wedding-test-') && path.dirname(scratch) === process.cwd());
  await rm(scratch, { recursive: true, force: true });
}
