import sharp from 'sharp';
export async function validateImages(value: unknown): Promise<{ src: string; caption: string }[]> {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 4) throw new Error('이미지는 최대 4장까지 첨부할 수 있습니다.');
  const result = [];
  for (const entry of value) {
    if (typeof entry?.src !== 'string' || entry.src.length > 410000 || typeof entry.caption !== 'string' || entry.caption.length > 160) throw new Error('이미지 용량이나 설명을 확인해 주세요.');
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(entry.src);
    if (!match) throw new Error('PNG, JPEG, WebP 이미지만 지원합니다.');
    const buffer = Buffer.from(match[2], 'base64');
    const image = sharp(buffer, { limitInputPixels: 16000000, animated: false });
    const meta = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format || '')) throw new Error('지원하지 않는 이미지 형식입니다.');
    const output = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    if (output.length > 300000) throw new Error('이미지 크기를 줄여 다시 첨부해 주세요.');
    result.push({ src: 'data:image/webp;base64,' + output.toString('base64'), caption: entry.caption.trim() });
  }
  return result;
}
