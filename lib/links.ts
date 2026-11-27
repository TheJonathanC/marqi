// Cleans provider URLs coming out of JustWatch and makes sure they land on the
// storefront for the region you're browsing (India or the UAE). Pure
// functions, no imports, so they run under `node --test`.

type Provider = "nfx" | "prv" | "jhs" | "atp";
type Region = "IN" | "AE";

const TRACKING_PARAMS = new Set([
  // Generic
  "fbclid", "gclid", "ref", "ref_", "search_query",
  // Amazon affiliate / campaign
  "tag", "linkcode", "camp", "creative", "creativeasin", "ascsubtag", "linkid",
  // Apple affiliate / campaign
  "at", "ct", "itscg", "itsct", "mttnsubad", "mttnagencyid", "mttnsiteid",
  // Netflix
  "trackid", "tctx",
]);

// primevideo.com links carry a global gti and work in any Prime country.
// amazon.in is the Indian store only; other Amazon stores break in both regions.
const PRIME_HOSTS = new Set(["app.primevideo.com", "www.primevideo.com", "primevideo.com"]);
const PRIME_INDIA_HOSTS = new Set(["www.amazon.in", "amazon.in"]);
const NETFLIX_HOSTS = new Set(["www.netflix.com", "netflix.com"]);
const HOTSTAR_HOSTS = new Set([
  "www.hotstar.com", "hotstar.com", "www.jiohotstar.com", "jiohotstar.com",
]);

// A two-letter region as the first path segment, e.g. /in/ or /us/.
const REGION_SEGMENT = /^\/([a-z]{2})(?=\/|$)/i;
// Netflix locale prefixes, e.g. /in/ or /ae-en/. Netflix picks the right
// catalog from where you are, so a prefix only gets in the way.
const NETFLIX_LOCALE = /^\/[a-z]{2}(-[a-z]{2})?(?=\/)/i;

export function stripTracking(url: URL): URL {
  const out = new URL(url);
  for (const key of [...out.searchParams.keys()]) {
    const k = key.toLowerCase();
    if (k.startsWith("utm_") || TRACKING_PARAMS.has(k)) out.searchParams.delete(key);
  }
  return out;
}

/**
 * Returns a clean URL for the provider in `region`, or null when the link
 * points somewhere it shouldn't (another storefront, another site, http).
 * Prime's `gti` and Apple's `showId`/`playableId` are never touched.
 */
export function safeProviderUrl(provider: Provider, raw: string, region: Region = "IN"): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const store = region.toLowerCase();

  switch (provider) {
    case "nfx":
      if (!NETFLIX_HOSTS.has(host)) return null;
      url.pathname = url.pathname.replace(NETFLIX_LOCALE, "");
      break;
    case "prv":
      // amazon.com, amazon.co.uk, ... are other storefronts and break here.
      if (!PRIME_HOSTS.has(host) && !(region === "IN" && PRIME_INDIA_HOSTS.has(host))) return null;
      break;
    case "jhs": {
      // JioHotstar only exists in India.
      if (region !== "IN" || !HOTSTAR_HOSTS.has(host)) return null;
      const segment = url.pathname.match(REGION_SEGMENT)?.[1]?.toLowerCase();
      if (segment && segment !== "in") return null;
      break;
    }
    case "atp": {
      if (host !== "tv.apple.com") return null;
      // Apple IDs are global, so a wrong region can be rewritten instead of rejected.
      const match = url.pathname.match(REGION_SEGMENT);
      if (!match) url.pathname = `/${store}` + url.pathname;
      else if (match[1].toLowerCase() !== store) url.pathname = url.pathname.replace(REGION_SEGMENT, `/${store}`);
      break;
    }
    default:
      return null;
  }

  return stripTracking(url).toString();
}

/** Where to send someone when JustWatch has no usable link for a title. */
export function providerSearchUrl(provider: Provider, title: string, region: Region = "IN"): string {
  const q = encodeURIComponent(title);
  switch (provider) {
    case "nfx":
      return `https://www.netflix.com/search?q=${q}`;
    case "prv":
      return `https://www.primevideo.com/search/?phrase=${q}`;
    case "jhs":
      return `https://www.hotstar.com/in/explore?search_query=${q}`;
    case "atp":
      return `https://tv.apple.com/${region.toLowerCase()}/search?term=${q}`;
  }
}
