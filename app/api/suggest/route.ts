import { NextResponse, type NextRequest } from "next/server";
import { getSuggestions } from "@/lib/catalog";
import { posterThumb } from "@/lib/images";
import { resolveScope } from "@/lib/providers";
import { getSessionUser } from "@/lib/session";
import { visible } from "@/lib/taste";
import { loadProfile } from "@/lib/watch";

/** What the search box shows for each match. Kept small: it's fetched as you type. */
export type Suggestion = {
  id: string;
  title: string;
  year: number | null;
  kind: "movie" | "show";
  poster: string | null;
  providers: string[];
};

const MAX = 8;

/**
 * JustWatch ranks matches by popularity, so typing "hunger" can put a popular
 * film that merely mentions hunger first. Titles that start with what you
 * typed come first, then ones with a word that does, then the rest, each
 * group keeping JustWatch's order.
 */
function matchRank(title: string, q: string): number {
  const t = title.toLowerCase().replace(/^(the|a|an) /, "");
  if (t.startsWith(q) || title.toLowerCase().startsWith(q)) return 0;
  if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t)) return 1;
  return t.includes(q) ? 2 : 3;
}

// Search-as-you-type for the header search box. Same rules as the search
// page: your region and services, your language filter, nothing you've hidden.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json([]);

  const profile = await loadProfile(user.id).catch(() => null);
  const { catalog } = resolveScope(profile?.prefs);
  const titles = await getSuggestions(q.toLowerCase(), catalog).catch(() => []);

  const term = q.toLowerCase();
  const body: Suggestion[] = visible(titles, profile)
    .map((t, i) => ({ t, i, rank: matchRank(t.title, term) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(({ t }) => t)
    .slice(0, MAX)
    .map((t) => ({
      id: t.id,
      title: t.title,
      year: t.year,
      kind: t.kind,
      poster: t.poster ? posterThumb(t.poster) : null,
      providers: t.offers.map((o) => o.provider),
    }));

  return NextResponse.json(body, {
    // Per user (their services and filters), so only the browser may keep it.
    headers: { "cache-control": "private, max-age=300" },
  });
}
