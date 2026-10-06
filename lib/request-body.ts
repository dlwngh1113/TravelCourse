export async function boundedJson(request: Request, limit = 20000) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('요청 내용이 없습니다.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new Error('입력 용량이 너무 큽니다.'); } chunks.push(value); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
