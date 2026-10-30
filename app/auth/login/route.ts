import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, devBypassEnabled, githubConfigured, safeNext } from "@/lib/github";
import { setSessionUser } from "@/lib/session";
import { upsertUser } from "@/lib/watch";

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (devBypassEnabled()) {
    const user = { id: "dev", login: "dev", name: "Local Dev", avatarUrl: null };
    await upsertUser(user);
    await setSessionUser(user);
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (!githubConfigured()) {
    return NextResponse.redirect(new URL("/login?error=config", request.url));
  }

  const state = crypto.randomUUID();
  (await cookies()).set("marqi_oauth", JSON.stringify({ state, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth",
    maxAge: 600,
  });
  const redirectUri = new URL("/auth/callback", request.url).toString();
  return NextResponse.redirect(authorizeUrl(redirectUri, state));
}
