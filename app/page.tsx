import Gallery from "./gallery";
import { listComponents } from "@/lib/store";
import { currentUser, configured } from "@/lib/auth";
import { purchasedIds } from "@/lib/store";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [items, user] = await Promise.all([listComponents(), currentUser()]);
  const purchased = user ? await purchasedIds(user.id) : [];
  return (
    <Gallery
      initialItems={items}
      user={user}
      authReady={configured()}
      purchasedIds={purchased}
    />
  );
}
