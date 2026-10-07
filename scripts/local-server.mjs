import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const file = path.join(root, '.env.local-test');
if (!existsSync(file)) writeFileSync(file, readFileSync('.env.local-test.example', 'utf8') + '\nSESSION_SECRET=' + randomBytes(32).toString('hex') + '\n', { mode: 0o600 });
const local = parseEnv(readFileSync(file, 'utf8'));
const port = Number(process.env.LOCAL_TEST_PORT || local.PORT || 3100);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be 1024–65535.');
if (local.POLAR_ENVIRONMENT && local.POLAR_ENVIRONMENT !== 'sandbox') throw new Error('Local testing accepts Polar sandbox only.');
const origin = 'http://127.0.0.1:' + port;
if (process.argv.includes('--setup')) { console.log('Ready: .env.local-test | ' + origin); process.exit(0); }
const env = { ...process.env, NODE_ENV: 'development', LOCAL_TEST_MODE: '1', APP_URL: origin, PORT: String(port),
 INVITATION_DATA_DIR: path.join(root, 'data/local-tests/invitations'),
 SESSION_SECRET: local.SESSION_SECRET || randomBytes(32).toString('hex'),
 GITHUB_CLIENT_ID: local.GITHUB_CLIENT_ID || '', GITHUB_CLIENT_SECRET: local.GITHUB_CLIENT_SECRET || '',
 POLAR_ENVIRONMENT: 'sandbox', POLAR_ACCESS_TOKEN: local.POLAR_ACCESS_TOKEN || '', POLAR_PRODUCT_ID: local.POLAR_PRODUCT_ID || '',
 STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '',
};
console.log('Local site: ' + origin);
console.log('Polar sandbox: ' + (env.POLAR_ACCESS_TOKEN && env.POLAR_PRODUCT_ID ? 'configured' : 'configure .env.local-test to enable subscriptions'));
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { cwd: root, env, stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
