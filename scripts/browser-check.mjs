import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({channel: 'msedge', headless: true});
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3000';
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1080}});
  await page.goto(origin, {waitUntil: 'networkidle'});
  assert.equal(await page.locator('.card').count(), 12);
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
  assert.ok(!/[가-힣]/u.test(await page.locator('.header').innerText()));
  assert.ok(!/[가-힣]/u.test(await page.locator('.search').innerText()));
  assert.ok(!/[가-힣]/u.test(await page.locator('footer').innerText()));
  await page.screenshot({path: 'desktop-check.png', fullPage: true});
  await page.getByRole('combobox', {name: '地區', exact: true}).selectOption('11');
  await page.getByRole('button', {name: '尋找景點'}).click();
  await page.waitForURL('**region=11**');
  await page.locator('.card').first().click();
  await page.getByRole('heading', {name: '景點介紹'}).waitFor();
  await page.screenshot({path: 'detail-check.png', fullPage: true});
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(origin, {waitUntil: 'networkidle'});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No horizontal overflow');
  await page.screenshot({path: 'mobile-check.png', fullPage: true});
  console.log('PASS desktop, region form, detail navigation, mobile layout');
} finally {await browser.close();}
