import WeddingStudio from './wedding-studio';
import { myInvitations } from '@/lib/invitation-store';
import { paymentStatus, tossAmount, tossConfigured } from '@/lib/payments';
import { currentUser, configured, githubConfigured, googleConfigured } from "@/lib/auth";
import LocalTestBar from './local-test-bar';
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await currentUser();
  const [items, status] = user ? await Promise.all([myInvitations(user.id), paymentStatus(user.id)]) : [[], { active: false, configured: tossConfigured(), amount: tossAmount() }];
  return (
    <>
    <LocalTestBar user={user}/>
    <WeddingStudio
      initialItems={items}
      user={user}
      authReady={configured()}
      githubReady={githubConfigured()}
      googleReady={googleConfigured()}
      initialMembership={status}
    />
    </>
  );
}
