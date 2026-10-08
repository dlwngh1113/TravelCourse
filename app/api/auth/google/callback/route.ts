import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { googleConfigured, googleCallbackUrl, googleUserId, signSession, cookieOptions } from '@/lib/auth';

const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const state = jar.get('google_state')?.value;
  const nonce = jar.get('google_nonce')?.value;
  const verifier = jar.get('google_verifier')?.value;
  jar.delete('google_state'); jar.delete('google_nonce'); jar.delete('google_verifier');
  const failure = () => NextResponse.redirect(new URL('/?auth=error', process.env.APP_URL || request.url));
  const code = url.searchParams.get('code');
  if (!googleConfigured() || !state || !nonce || !verifier || state !== url.searchParams.get('state') || !code) return failure();
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: googleCallbackUrl(), grant_type: 'authorization_code', code_verifier: verifier }),
      signal: AbortSignal.timeout(15000), cache: 'no-store',
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokens.id_token !== 'string') return failure();
    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: process.env.GOOGLE_CLIENT_ID,
    });
    if (payload.nonce !== nonce || typeof payload.sub !== 'string' || payload.sub.length > 255) return failure();
    const login = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 100) : (typeof payload.email === 'string' ? payload.email : `google-${payload.sub.slice(-8)}`);
    const response = NextResponse.redirect(new URL('/', process.env.APP_URL));
    response.cookies.set('ac_session', signSession({ id: googleUserId(payload.sub), login, provider: 'google' }), { ...cookieOptions, maxAge: 604800 });
    return response;
  } catch { return failure(); }
}
