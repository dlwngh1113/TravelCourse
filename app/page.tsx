import WeddingStudio from './wedding-studio';
import { myInvitations } from '@/lib/invitation-store';
import { membership, polarConfigured } from '@/lib/polar';
import { currentUser, configured } from "@/lib/auth";
import LocalTestBar from './local-test-bar';
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await currentUser();
  const [items, status] = user ? await Promise.all([myInvitations(user.id), membership(user.id)]) : [[], { active: false, configured: polarConfigured() }];
  return (
    <>
    <LocalTestBar user={user}/>
    <WeddingStudio
      initialItems={items}
      user={user}
      authReady={configured()}
      initialMembership={status}
    />
    </>
  );
}
