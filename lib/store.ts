import "server-only";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { Component, seeds } from "./components";
const directory = path.resolve(process.env.DATA_DIR || "./data/components");
export async function listComponents(): Promise<Component[]> {
  await mkdir(directory, { recursive: true });
  const files = await readdir(directory);
  const items = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(
        async (f) =>
          JSON.parse(
            await readFile(path.join(directory, f), "utf8"),
          ) as Component,
      ),
  );
  return [
    ...items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ...seeds,
  ];
}
export async function saveComponent(item: Component) {
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, `${item.id}.json`);
  await writeFile(`${target}.tmp`, JSON.stringify(item), "utf8");
  await rename(`${target}.tmp`, target);
}
export async function removeComponent(
  id: string,
  ownerId: number,
  login: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return "missing";
  const target = path.join(directory, `${id}.json`);
  let item: Component;
  try {
    item = JSON.parse(await readFile(target, "utf8"));
  } catch {
    return "missing";
  }
  if (
    item.ownerId !== undefined
      ? item.ownerId !== ownerId
      : item.author !== login
  )
    return "forbidden";
  await unlink(target);
  return "deleted";
}
export type Purchase = {
  id: string;
  componentId: string;
  buyerId: number;
  sellerId?: number;
  amountCents: number;
  currency: "usd";
  stripeSessionId: string;
  createdAt: string;
};
async function readJson<T>(name: string) {
  try {
    return JSON.parse(await readFile(path.join(directory, name), "utf8")) as T;
  } catch {
    return null;
  }
}
export async function getComponent(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return readJson<Component>(`${id}.json`);
}
export async function saveSeller(userId: number, stripeAccountId: string) {
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `seller-${userId}.json`),
    JSON.stringify({ userId, stripeAccountId }),
    "utf8",
  );
}
export async function getSeller(userId: number) {
  return readJson<{ userId: number; stripeAccountId: string }>(
    `seller-${userId}.json`,
  );
}
export async function savePurchase(purchase: Purchase) {
  await mkdir(directory, { recursive: true });
  const target = path.join(
    directory,
    `purchase-${purchase.stripeSessionId}.json`,
  );
  await writeFile(`${target}.tmp`, JSON.stringify(purchase), "utf8");
  await rename(`${target}.tmp`, target);
}
export async function hasPurchase(buyerId: number, componentId: string) {
  await mkdir(directory, { recursive: true });
  const files = await readdir(directory);
  for (const file of files.filter(
    (f) => f.startsWith("purchase-") && f.endsWith(".json"),
  )) {
    const item = await readJson<Purchase>(file);
    if (item?.buyerId === buyerId && item.componentId === componentId)
      return true;
  }
  return false;
}
export async function purchasedIds(buyerId: number) {
  await mkdir(directory, { recursive: true });
  const files = await readdir(directory);
  const ids: string[] = [];
  for (const file of files.filter(
    (f) => f.startsWith("purchase-") && f.endsWith(".json"),
  )) {
    const item = await readJson<Purchase>(file);
    if (item?.buyerId === buyerId) ids.push(item.componentId);
  }
  return ids;
}
