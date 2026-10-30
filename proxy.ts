import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate: anyone without a session cookie goes to /login. The cookie
// is properly verified wherever user data is read or written (lib/session.ts).
export function proxy(request: NextRequest) {
  if (request.cookies.has("marqi_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|auth|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
