import { notFound } from 'next/navigation';
import { getInvitation } from '@/lib/invitation-store';
import InvitationView from '@/app/invitation-view';
export const dynamic = 'force-dynamic';
export const metadata = { title: '소중한 당신을 초대합니다 · 우리의 날', robots: { index: false, follow: false } };
export default async function SharedInvitation({ params }: { params: Promise<{ id: string }> }) {
  const item = await getInvitation((await params).id);
  if (!item || !item.published || item.deletedAt) notFound();
  return <main className="shared-invitation"><InvitationView item={item}/><a className="shared-brand" href="/">우리의 날 · 모바일 청첩장</a></main>;
}
