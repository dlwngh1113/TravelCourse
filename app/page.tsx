import Gallery from "./gallery";
import { listPrompts } from "@/lib/store";
import { publicPrompt } from "@/lib/prompts";
import { currentUser, configured } from "@/lib/auth";
import { purchasedIds } from "@/lib/store";
import LocalTestBar from './local-test-bar';
export const dynamic = "force-dynamic";
export default async function Home() {
  const [items, user] = await Promise.all([listPrompts(), currentUser()]);
  const purchased = user ? await purchasedIds(user.id) : [];
  const visibleItems = items.filter(item => !item.deletedAt || purchased.includes(item.id)).map(item => publicPrompt(item, user?.id, purchased));
  return (
    <>
    <LocalTestBar user={user}/>
    <Gallery
      initialItems={visibleItems}
      user={user}
      authReady={configured()}
      purchasedIds={purchased}
    />
    </>
  );
}
