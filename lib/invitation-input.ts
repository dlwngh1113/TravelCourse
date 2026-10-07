import { validateImages } from './prompt-images';
import type { Invitation } from './invitations';
export async function invitationInput(data: Record<string, unknown>): Promise<Pick<Invitation, 'firstName'|'secondName'|'date'|'time'|'venue'|'address'|'directions'|'message'|'theme'|'images'|'published'>> {
  const text = (key: string, max: number, required = true) => {
    const value = data?.[key];
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('이름, 예식 정보와 초대 문구를 확인해 주세요.');
    return value.trim();
  };
  const date = text('date', 10), time = text('time', 5);
  const parsed = new Date(date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('예식 날짜와 시간을 확인해 주세요.');
  if (!['linen','rose','sage'].includes(String(data.theme)) || typeof data.published !== 'boolean') throw new Error('청첩장 설정을 확인해 주세요.');
  return { firstName: text('firstName',40), secondName: text('secondName',40), date, time, venue: text('venue',120), address: text('address',250), directions: text('directions',2000,false), message: text('message',3000), theme: data.theme as Invitation['theme'], images: await validateImages(data.images), published: data.published };
}
