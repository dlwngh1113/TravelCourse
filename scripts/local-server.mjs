import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const file = path.join(root, '.env.local-test');
if (!existsSync(file)) {
  writeFileSync(file, readFileSync('.env.local-test.example', 'utf8') +
    '\nSESSION_SECRET=' + randomBytes(32).toString('hex') + '\n', { mode: 0o600 });
  console.log('Created .env.local-test (private local settings).');
}
const local = parseEnv(readFileSync(file, 'utf8'));
const port = Number(process.env.LOCAL_TEST_PORT || local.PORT || 3100);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be 1024–65535.');
const stripeKey = local.STRIPE_SECRET_KEY?.trim() || '';
if (stripeKey && !/^sk_test_/.test(stripeKey)) {
  throw new Error('Local testing accepts only sk_test_ Stripe keys.');
}
const origin = 'http://127.0.0.1:' + port;
if (process.argv.includes('--setup')) {
  console.log('Ready: .env.local-test | ' + origin + ' | data/local-tests/components');
  process.exit(0);
}
const listen = process.argv.includes('--listen');
const env = {
  ...process.env,
  NODE_ENV: 'development',
  LOCAL_TEST_MODE: '1',
  APP_URL: origin,
  PORT: String(port),
  DATA_DIR: path.join(root, 'data/local-tests/components'),
  SESSION_SECRET: local.SESSION_SECRET || randomBytes(32).toString('hex'),
  GITHUB_CLIENT_ID: local.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: local.GITHUB_CLIENT_SECRET || '',
  STRIPE_SECRET_KEY: stripeKey,
  STRIPE_WEBHOOK_SECRET: local.STRIPE_WEBHOOK_SECRET || '',
};
console.log('Local site: ' + origin);
console.log('Stripe: ' + (stripeKey ? 'sandbox key configured' : 'not configured; UI/upload testing available'));
const require = createRequire(import.meta.url);
const executable = process.execPath;
const args = listen
  ? [require.resolve('@stripe/cli/bin/shim.js'), 'listen', '--events', 'checkout.session.completed,checkout.session.async_payment_succeeded',
     '--forward-to', origin + '/api/stripe/webhook']
  : ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)];
const child = spawn(executable, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
child.on('error', error => {
  console.error(listen && error.code === 'ENOENT'
    ? 'Stripe CLI is not installed. See docs/local-testing.md, then run stripe login.'
    : error.message);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
