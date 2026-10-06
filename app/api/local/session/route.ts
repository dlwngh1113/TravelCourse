import { NextResponse } from 'next/server';
import { cookieOptions, signSession } from '@/lib/auth';
import { localTestingEnabled } from '@/lib/local-testing';

export async function POST(request: Request) {
  if (!localTestingEnabled()) return new NextResponse(null, { status: 404 });
  const origin = new URL(process.env.APP_URL!).origin;
  if (request.headers.get('origin') !== origin || request.headers.get('host') !== new URL(origin).host) {
    return NextResponse.json({ error: '로컬 사이트에서만 사용할 수 있습니다.' }, { status: 403 });
  }
  const role = (await request.formData()).get('role');
  if (!['seller', 'buyer', 'logout'].includes(String(role))) {
    return NextResponse.json({ error: '올바른 테스트 계정을 선택해 주세요.' }, { status: 400 });
  }
  const response = NextResponse.redirect(new URL('/', origin), 303);
  if (role === 'logout') response.cookies.delete('ac_session');
  else response.cookies.set('ac_session', signSession({
    id: role === 'seller' ? 900000001 : 900000002,
    login: role === 'seller' ? 'local-seller' : 'local-buyer',
  }), { ...cookieOptions, secure: false, maxAge: 86400 });
  return response;
}
