import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { removePrompt } from '@/lib/store';
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  try {
    const result = await removePrompt((await params).id, user.id);
    if (result === 'missing') return NextResponse.json({ error: '프롬프트를 찾을 수 없습니다.' }, { status: 404 });
    if (result === 'forbidden') return NextResponse.json({ error: '본인이 올린 프롬프트만 삭제할 수 있습니다.' }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: '삭제하지 못했습니다.' }, { status: 500 }); }
}
