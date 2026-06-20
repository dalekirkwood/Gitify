import { load, type Store } from "@tauri-apps/plugin-store";

// ponytail: PAT in a Tauri store now; swap save/get/clear to the OS keychain
// (tauri-plugin-keyring) before shipping — token is a credential, not a setting.
export interface Credentials {
  baseUrl: string;
  token: string;
}

const FILE = "gitify.json";
const KEY = "credentials";

let store: Store | null = null;
async function get(): Promise<Store> {
  if (!store) store = await load(FILE);
  return store;
}

export async function saveCredentials(c: Credentials): Promise<void> {
  const s = await get();
  await s.set(KEY, c);
  await s.save();
}

export async function loadCredentials(): Promise<Credentials | null> {
  const s = await get();
  return (await s.get<Credentials>(KEY)) ?? null;
}

export async function clearCredentials(): Promise<void> {
  const s = await get();
  await s.delete(KEY);
  await s.save();
}
