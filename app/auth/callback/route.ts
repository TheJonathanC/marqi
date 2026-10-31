import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, isAllowed, safeNext } from "@/lib/github";
import { setSessionUser } from "@/lib/session";
import { upsertUser } from "@/lib/watch";

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const raw = jar.get("marqi_oauth")?.value;
  jar.delete({ name: "marqi_oauth", path: "/auth" });

  const fail = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, request.url));

  let saved: { state?: string; next?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {}

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || state !== saved.state) return fail("state");

  let user;
  try {
    const redirectUri = new URL("/auth/callback", request.url).toString();
    user = await exchangeCode(code, redirectUri);
  } catch (err) {
    console.error("[marqi] GitHub sign-in failed", err);
    return fail("github");
  }
  if (!isAllowed(user.login)) return fail("denied");

  try {
    await upsertUser(user);
    await setSessionUser(user);
  } catch (err) {
    console.error("[marqi] sign-in failed after GitHub", err);
    return fail("server");
  }

  return NextResponse.redirect(new URL(safeNext(saved.next), request.url));
}
