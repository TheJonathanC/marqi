import "server-only";
import type { SessionUser } from "./session";

// Minimal GitHub OAuth. One provider, no library: the whole flow is two
// requests, and it stays out of the way of Cache Components.

export function githubConfigured() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

/** Dev convenience: sign in as a local user when GitHub isn't configured. */
export function devBypassEnabled() {
  return process.env.NODE_ENV === "development" && !githubConfigured();
}

export function authorizeUrl(redirectUri: string, state: string) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

export async function exchangeCode(code: string, redirectUri: string): Promise<SessionUser> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const token = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!token.access_token) throw new Error(`GitHub token exchange failed: ${token.error ?? tokenRes.status}`);

  const userRes = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${token.access_token}`, accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!userRes.ok) throw new Error(`GitHub user lookup failed: ${userRes.status}`);
  const u = (await userRes.json()) as { id: number; login: string; name: string | null; avatar_url: string | null };
  return { id: `gh:${u.id}`, login: u.login, name: u.name, avatarUrl: u.avatar_url };
}

/** Only GitHub logins listed in ALLOWED_GITHUB_LOGINS may sign in. Empty means nobody. */
export function isAllowed(login: string) {
  const allowed = (process.env.ALLOWED_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(login.toLowerCase());
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
