import { currentUser } from '@/lib/auth';
import { getPrompt, savePrompt } from '@/lib/store';
import { publicPrompt } from '@/lib/prompts';
import { validateImages } from '@/lib/prompt-images';
import { boundedJson } from '@/lib/request-body';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (request.headers.get('origin') !== new URL(process.env.APP_URL || request.url).origin) return Response.json({ error: '잘못된 요청입니다.' }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const item = await getPrompt((await params).id);
  if (!item || item.deletedAt) return Response.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  if (item.ownerId !== user.id) return Response.json({ error: '본인 상품만 수정할 수 있습니다.' }, { status: 403 });
  let data, images;
  try {
    data = await boundedJson(request, 2000000);
    if (typeof data?.instructions !== 'string' || !data.instructions.trim() || data.instructions.length > 20000) throw new Error('사용 방법을 확인해 주세요.');
    images = await validateImages(data.images);
  } catch { return Response.json({ error: '설명과 이미지 입력을 확인해 주세요.' }, { status: 400 }); }
  const updated = { ...item, instructions: data.instructions, images };
  await savePrompt(updated);
  return Response.json(publicPrompt(updated, user.id));
}
