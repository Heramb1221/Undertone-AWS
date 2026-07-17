/**
 * TEMPORARY stopgap. Until Phase 13 wires real Cognito JWT verification into every
 * request, we store the Anonymous Identity locally after onboarding and use the
 * name itself as a stand-in for a real user_id. Replace all call sites with the
 * verified Cognito `sub` once that lands — flagged here so it's easy to grep for.
 */

const KEY = "undertone_identity";

export type LocalIdentity = { name: string; avatarSeed: string; userId: string };

export function saveLocalIdentity(identity: LocalIdentity) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(identity));
}

export function getLocalIdentity(): LocalIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
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
