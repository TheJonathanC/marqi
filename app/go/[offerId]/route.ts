import { NextResponse, type NextRequest } from "next/server";
import { getFreshOffers } from "@/lib/catalog";
import { parseOfferId } from "@/lib/justwatch";
import { providerSearchUrl, safeProviderUrl } from "@/lib/links";
import { getSessionUser } from "@/lib/session";
import { recordClick } from "@/lib/watch";

// The smart redirect. Takes only an offer ID, never a URL, so it can't be used
// as an open redirect. Resolves the current link, cleans it, checks it lands
// on an Indian storefront, logs the click, then hands off to the provider.
export async function GET(_request: NextRequest, ctx: RouteContext<"/go/[offerId]">) {
  const offerId = decodeURIComponent((await ctx.params).offerId);
  const parsed = parseOfferId(offerId);
  if (!parsed) return new NextResponse("Unknown offer", { status: 404 });

  const title = await getFreshOffers(parsed.titleId).catch(() => null);
  if (!title) return new NextResponse("Title not found", { status: 404 });

  // Prefer the exact offer; fall back to the same provider if JustWatch
  // re-issued it (e.g. the quality changed).
  const offer =
    title.offers.find((o) => o.id === offerId) ?? title.offers.find((o) => o.provider === parsed.provider);
  const target =
    (offer && safeProviderUrl(offer.provider, offer.url)) ?? providerSearchUrl(parsed.provider, title.title);

  const user = await getSessionUser();
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

  const res = NextResponse.redirect(target, 302);
  res.headers.set("referrer-policy", "no-referrer");
  res.headers.set("cache-control", "no-store");
  return res;
}
