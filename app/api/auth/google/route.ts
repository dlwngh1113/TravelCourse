import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { googleConfigured, googleCallbackUrl, cookieOptions } from '@/lib/auth';

export async function GET(request: Request) {
  if (!googleConfigured()) return NextResponse.redirect(new URL('/?auth=setup', request.url));
  const state = randomBytes(32).toString('hex');
  const nonce = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: googleCallbackUrl(), response_type: 'code',
    scope: 'openid email profile', state, nonce,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set('google_state', state, { ...cookieOptions, maxAge: 600 });
  response.cookies.set('google_nonce', nonce, { ...cookieOptions, maxAge: 600 });
  response.cookies.set('google_verifier', verifier, { ...cookieOptions, maxAge: 600 });
  return response;
}
