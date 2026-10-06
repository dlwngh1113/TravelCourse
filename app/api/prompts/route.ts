import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { categories, PromptItem, publicPrompt } from '@/lib/prompts';
import { savePrompt, getSeller } from '@/lib/store';
import { validateImages } from '@/lib/prompt-images';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin)
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'GitHub 로그인이 필요합니다.' }, { status: 401 });
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: '내용이 없습니다.' }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 2000000) { await reader.cancel(); return NextResponse.json({ error: '입력 내용과 이미지 용량이 너무 큽니다.' }, { status: 413 }); }
      chunks.push(value);
    }
    let data;
    try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return NextResponse.json({ error: '올바른 입력 형식이 아닙니다.' }, { status: 400 }); }
    const text = (key: string, max: number) => typeof data?.[key] === 'string' && data[key].trim().length > 0 && data[key].length <= max;
    if (!text('title', 80) || !text('summary', 500) || !text('prompt', 50000) || !text('instructions', 20000) || !text('model', 80) ||
      !categories.slice(1).includes(data?.category) || !Number.isInteger(data?.priceCents) || data.priceCents < 0 || data.priceCents > 100000 || data.licenseAccepted !== true)
      return NextResponse.json({ error: '제목, 소개, 프롬프트, 사용 방법, 카테고리, 가격(0~1,000달러)과 라이선스 동의를 확인해 주세요.' }, { status: 400 });
    let images;
    try { images = await validateImages(data.images); } catch { return NextResponse.json({ error: '이미지는 최대 4장, PNG·JPEG·WebP 형식으로 첨부해 주세요.' }, { status: 400 }); }
    const seller = data.priceCents > 0 ? await getSeller(user.id) : null;
    if (data.priceCents > 0 && !seller) return NextResponse.json({ error: '유료 프롬프트를 올리려면 판매자 정산 계정을 연결해 주세요.' }, { status: 409 });
    const item: PromptItem = {
      kind: 'prompt', images, id: randomUUID(), title: data.title.trim(), summary: data.summary.trim(),
      prompt: data.prompt, instructions: data.instructions, model: data.model.trim(), category: data.category,
      author: user.login, ownerId: user.id, createdAt: new Date().toISOString(), color: '#eee9fa',
      tags: ['community'], priceCents: data.priceCents, currency: 'usd', sellerStripeAccountId: seller?.stripeAccountId,
    };
    await savePrompt(item);
    return NextResponse.json(publicPrompt(item, user.id), { status: 201 });
  } catch {
    return NextResponse.json({ error: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
