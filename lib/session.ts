import "server-only";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

export const SESSION_COOKIE = "marqi_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
};

function password(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return "marqi-dev-only-session-secret-do-not-use";
  throw new Error("SESSION_SECRET must be set to at least 32 characters");
}

/**
 * The signed-in user, for Server Components. Unsealing checks expiry against
 * the clock, so it runs in a private (per-browser) cache scope rather than
 * during prerendering.
 */
export async function getViewer(): Promise<SessionUser | null> {
  "use cache: private";
  cacheLife("minutes");
  return getSessionUser();
}

/** Reads and verifies the session cookie. Returns null when signed out or tampered with. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const data = await unsealData<{ user?: SessionUser }>(cookie, { password: password(), ttl: MAX_AGE });
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function setSessionUser(user: SessionUser) {
  const sealed = await sealData({ user }, { password: password(), ttl: MAX_AGE });
  (await cookies()).set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
