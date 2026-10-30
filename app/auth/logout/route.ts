import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "@/lib/session";

// POST only, so a stray link or prefetch can't sign you out.
export async function POST(request: NextRequest) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
