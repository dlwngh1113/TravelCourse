import 'server-only';

export type TourItem = Record<string, string>;
export const categories = [['76', '觀光景點', '◈'], ['78', '文化設施', '▥'], ['82', '美食餐廳', '♨'], ['80', '住宿', '⌂'], ['79', '購物', '▧'], ['85', '節慶與表演', '✺'], ['75', '休閒運動', '↗'], ['77', '交通', '⇄']];
export const categoryName = (id: string) => categories.find(([code]) => code === id)?.[1] || '景點';
export function plain(value?: string) {
  return (value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}
export function safeImage(value?: string) {
  if (!value) return undefined;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href.replace(/^http:/, 'https:') : undefined; } catch { return undefined; }
}
export async function tour(operation: string, params: Record<string, string> = {}): Promise<{items: TourItem[]; total: number}> {
  const rawKey = process.env.TOUR_API_KEY;
  if (!rawKey) throw new Error('旅遊服務尚未完成設定，請聯絡網站管理員。');
  const serviceKey = rawKey.includes('%') ? decodeURIComponent(rawKey) : rawKey;
  const query = new URLSearchParams({serviceKey, MobileOS: 'ETC', MobileApp: 'GilKorea', _type: 'json', numOfRows: '12', pageNo: '1', ...params});
  let response: Response;
  try { response = await fetch(`https://apis.data.go.kr/B551011/ChtService2/${operation}?${query}`, {cache: 'no-store', signal: AbortSignal.timeout(12000)}); }
  catch { throw new Error('無法連線至旅遊資訊服務，請稍後再試。'); }
  if (!response.ok) throw new Error(`旅遊資訊服務暫無回應。（狀態碼 ${response.status})`);
  const text = await response.text();
  if (text.trim().startsWith('<')) {
    const code = text.match(/<returnReasonCode>(.*?)<\/returnReasonCode>/)?.[1];
    throw new Error(code === '22' ? '今日旅遊資訊查詢已達上限，請明日再試。' : `旅遊資訊服務驗證失敗或暫時無法使用。${code ? ` (代碼 ${code})` : ''}`);
  }
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('旅遊資訊服務傳回的資料格式不正確。'); }
  const header = data.response?.header;
  if (!header || !['0000', '00'].includes(String(header.resultCode))) throw new Error('無法載入旅遊資訊，請聯絡網站管理員確認服務狀態。');
  const body = data.response.body;
  const records = body?.items?.item;
  return {items: !records ? [] : Array.isArray(records) ? records : [records], total: Number(body?.totalCount || 0)};
}
