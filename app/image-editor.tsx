'use client';
import { useState } from 'react';
export type DescriptionImage = { src: string; caption: string };
export default function ImageEditor({ images, onChange }: { images: DescriptionImage[]; onChange: (images: DescriptionImage[]) => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function add(files: File[]) {
    setError(''); setBusy(true);
    try {
      if (files.length + images.length > 4) throw new Error('이미지는 최대 4장까지 첨부할 수 있습니다.');
      const next: DescriptionImage[] = [];
      for (const file of files) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error('PNG·JPEG·WebP 파일을 장당 5MB 이하로 선택해 주세요.');
        const bitmap = await createImageBitmap(file);
        try {
          const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          let src = canvas.toDataURL('image/webp', .8);
          if (src.length > 400000) src = canvas.toDataURL('image/webp', .5);
          if (src.length > 400000) throw new Error('사진이 너무 복잡하거나 큽니다. 크기를 줄여 다시 첨부해 주세요.');
          next.push({ src, caption: '' });
        } finally { bitmap.close(); }
      }
      onChange([...images, ...next]);
    } catch (e) { setError(e instanceof Error ? e.message : '이미지를 읽지 못했습니다.'); } finally { setBusy(false); }
  }
  return <section className="image-editor"><h3>판매 설명 이미지 · 공개</h3><p>사용 예시나 결과 화면을 최대 4장 첨부하세요. 구매 전에도 공개됩니다.</p><input aria-label="설명 이미지 첨부" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy || images.length >= 4} onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; void add(files); }}/>{busy && <p role="status">이미지 준비 중…</p>}{error && <p role="alert" className="form-error">{error}</p>}<div className="description-images">{images.map((image, index) => <figure key={index}><img src={image.src} alt={image.caption || '설명 이미지 ' + (index + 1)}/><input aria-label={'이미지 ' + (index + 1) + ' 설명'} placeholder="이미지 설명 (선택)" maxLength={160} value={image.caption} onChange={e => onChange(images.map((value, i) => i === index ? { ...value, caption: e.target.value } : value))}/><button type="button" className="secondary" onClick={() => onChange(images.filter((_, i) => i !== index))}>이미지 {index + 1} 제거</button></figure>)}</div></section>;
}
