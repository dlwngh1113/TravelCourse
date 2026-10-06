import 'server-only';

export function localTestingEnabled() {
  if (process.env.NODE_ENV !== 'development' || process.env.LOCAL_TEST_MODE !== '1') return false;
  try {
    const url = new URL(process.env.APP_URL || '');
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}
