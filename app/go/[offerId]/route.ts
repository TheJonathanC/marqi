import { NextResponse, type NextRequest } from "next/server";
import { getFreshOffers } from "@/lib/catalog";
import { parseOfferId } from "@/lib/justwatch";
import { providerSearchUrl, safeProviderUrl } from "@/lib/links";
import { inRegion, resolveScope } from "@/lib/providers";
import { getSessionUser } from "@/lib/session";
import { loadPrefs, recordClick } from "@/lib/watch";

// The smart redirect. Takes only an offer ID, never a URL, so it can't be used
// as an open redirect. Resolves the current link in the viewer's region,
// cleans it, checks it lands on that region's storefront, logs the click, then
// hands off to the provider.
//
// Offers carry the country they were issued for, so a Continue Watching card
// saved in India still works from Dubai: the title is looked up again in the
// UAE. A JioHotstar offer can't be, as JioHotstar is India-only, so it goes
// to the title page, which says where the title is showing instead.
export async function GET(request: NextRequest, ctx: RouteContext<"/go/[offerId]">) {
  const offerId = decodeURIComponent((await ctx.params).offerId);
  const parsed = parseOfferId(offerId);
  if (!parsed) return new NextResponse("Unknown offer", { status: 404 });

  const user = await getSessionUser();
  const prefs = user ? await loadPrefs(user.id).catch(() => null) : null;
  const region = prefs ? resolveScope(prefs).region : parsed.country;

  if (!inRegion(parsed.provider, region)) {
    return noStore(NextResponse.redirect(new URL(`/title/${parsed.titleId}`, request.url), 302));
  }

  const title = await getFreshOffers(parsed.titleId, { country: region, providers: [parsed.provider] }).catch(
    () => null,
  );
  if (!title) return new NextResponse("Title not found", { status: 404 });

  // Prefer the exact offer; fall back to the same provider if JustWatch
  // re-issued it (e.g. the quality changed) or it was issued for another region.
  const offer =
    title.offers.find((o) => o.id === offerId) ?? title.offers.find((o) => o.provider === parsed.provider);
  const target =
    (offer && safeProviderUrl(offer.provider, offer.url, region)) ??
    providerSearchUrl(parsed.provider, title.title, region);

  if (user) {
    await recordClick(user.id, {
      titleId: title.id,
      kind: title.kind,
      title: title.title,
      poster: title.poster,
      backdrop: title.backdrop,
      provider: parsed.provider,
      offerId: offer?.id ?? offerId,
      genres: title.genres,
      language: title.language,
    }).catch((err) => console.error("[marqi] failed to record click", err));
  }

  return noStore(NextResponse.redirect(target, 302));
}

function noStore(res: NextResponse) {
  res.headers.set("referrer-policy", "no-referrer");
  res.headers.set("cache-control", "no-store");
  return res;
}
