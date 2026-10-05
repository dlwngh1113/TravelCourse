import Gallery from './gallery';
import { listComponents } from '@/lib/store';
import { currentUser, configured } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Home() { const [items, user] = await Promise.all([listComponents(), currentUser()]); return <Gallery initialItems={items} user={user} authReady={configured()}/>; }

