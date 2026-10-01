import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve('next/package.json'));
const {loadEnvConfig} = nextRequire('@next/env');
const [mode, ...args] = process.argv.slice(2);

if (!['dev', 'start'].includes(mode)) {
  console.error('Usage: node scripts/next-server.mjs <dev|start> [Next.js options]');
  process.exit(1);
}

loadEnvConfig(process.cwd(), mode === 'dev');

const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), mode, ...args], {
  stdio: 'inherit',
  env: process.env,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 1);
});
