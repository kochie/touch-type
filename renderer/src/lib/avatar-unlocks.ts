import { FACES, HATS, isFaceUnlocked, isHatUnlocked, type AvatarStats } from "@/lib/avatars";

const SEEN_KEY = (userId: string) => `touch-typer-seen-unlocks:${userId}`;
const NEW_KEY = (userId: string) => `touch-typer-new-unlocks:${userId}`;
const PREMIUM_KEY = (userId: string) => `touch-typer-seen-premium:${userId}`;

function read(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: string[] | string) {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    // storage unavailable: celebrations just won't persist
  }
}

export const unlockId = (kind: "face" | "hat", slug: string) => `${kind}:${slug}`;

/** Everything the user can currently equip without Premium (earned + free). */
export function unlockedIds(stats: AvatarStats, isPremium: boolean): string[] {
  return [
    ...FACES.filter((f) => isFaceUnlocked(f, stats)).map((f) => unlockId("face", f.slug)),
    ...HATS.filter((h) => h.Component && isHatUnlocked(h, stats, isPremium)).map((h) => unlockId("hat", h.slug)),
  ];
}

/**
 * Returns ids unlocked since the last visit and remembers them as "new".
 * The first run for a user only records a baseline so existing unlocks don't celebrate.
 */
export function diffUnlocks(userId: string, ids: string[]): string[] {
  const seen = read(SEEN_KEY(userId));
  write(SEEN_KEY(userId), ids);
  if (!seen) return [];
  const fresh = ids.filter((id) => !seen.includes(id));
  if (fresh.length) write(NEW_KEY(userId), [...new Set([...(read(NEW_KEY(userId)) ?? []), ...fresh])]);
  return fresh;
}

/** True the first time a signed-in user is seen as premium after being non-premium. */
export function premiumJustActivated(userId: string, isPremium: boolean): boolean {
  const prev = (() => {
    try {
      return localStorage.getItem(PREMIUM_KEY(userId));
    } catch {
      return null;
    }
  })();
  write(PREMIUM_KEY(userId), isPremium ? "1" : "0");
  return isPremium && prev === "0";
}

export function getNewUnlocks(userId: string): string[] {
  return read(NEW_KEY(userId)) ?? [];
}

export function clearNewUnlock(userId: string, id: string) {
  write(NEW_KEY(userId), getNewUnlocks(userId).filter((x) => x !== id));
}
