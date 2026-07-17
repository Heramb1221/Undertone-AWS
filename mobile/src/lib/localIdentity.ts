/**
 * Caches the signed-in user's Anonymous Identity locally after onboarding, so
 * screens don't have to re-fetch the profile on every render. AsyncStorage-backed
 * (mobile's equivalent of web's localStorage-based localIdentity.ts) — same
 * "temporary stopgap" caveat: this is a client-side cache, not a session
 * mechanism. Actual auth state comes from Cognito (src/lib/cognito.ts).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "undertone_identity";

export type LocalIdentity = { userId: string; name: string; avatarSeed: string };

export async function saveLocalIdentity(identity: LocalIdentity): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(identity));
}

export async function getLocalIdentity(): Promise<LocalIdentity | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && !parsed.userId) {
      parsed.userId = parsed.name;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearLocalIdentity(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
