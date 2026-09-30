import assert from 'node:assert/strict';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3000';
for (const path of ['/', '/?region=11&type=76', `/?q=${encodeURIComponent('首爾')}`, '/places/629191', '/places/invalid']) {
  const response = await fetch(origin + path);
  const html = await response.text();
  const invalid = path.endsWith('invalid');
  assert.equal(response.status, 200, path);
  if (invalid) {
    assert.ok(html.includes('找不到此景點。'));
    assert.ok(html.includes('noindex'));
  }
  assert.equal(html.includes('hwV8qFUEuPQ'), false, 'API key must not be exposed');
  if (!invalid && path.startsWith('/places/')) assert.ok(html.includes('景點介紹'), 'Detail must be server-rendered');
  if (!path.startsWith('/places/')) assert.ok(html.includes('class="card"'), 'Real API results must be server-rendered');
  console.log(`PASS ${path}: HTTP ${response.status}, SSR content and secret isolation`);
}
