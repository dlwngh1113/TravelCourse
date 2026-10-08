import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { githubConfigured, cookieOptions, githubCallbackUrl } from '@/lib/auth';

export async function GET(request: Request) {
  if (!githubConfigured()) return NextResponse.redirect(new URL('/?auth=setup', request.url));
  const state = randomBytes(32).toString('hex');
  const verifier = randomBytes(32).toString('base64url');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!, redirect_uri: githubCallbackUrl(), state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set('ac_state', state, { ...cookieOptions, maxAge: 600 });
  response.cookies.set('ac_verifier', verifier, { ...cookieOptions, maxAge: 600 });
  return response;
}
