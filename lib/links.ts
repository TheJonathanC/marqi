// Cleans provider URLs coming out of JustWatch and makes sure they land on the
// Indian storefront. Pure functions, no imports, so they run under `node --test`.

type Provider = "prv" | "jhs" | "atp";

const TRACKING_PARAMS = new Set([
  // Generic
  "fbclid", "gclid", "ref", "ref_", "search_query",
  // Amazon affiliate / campaign
  "tag", "linkcode", "camp", "creative", "creativeasin", "ascsubtag", "linkid",
  // Apple affiliate / campaign
  "at", "ct", "itscg", "itsct", "mttnsubad", "mttnagencyid", "mttnsiteid",
]);

const PRIME_HOSTS = new Set([
  "app.primevideo.com", "www.primevideo.com", "primevideo.com",
  "www.amazon.in", "amazon.in",
]);
const HOTSTAR_HOSTS = new Set([
  "www.hotstar.com", "hotstar.com", "www.jiohotstar.com", "jiohotstar.com",
]);

// A two-letter region as the first path segment, e.g. /in/ or /us/.
const REGION_SEGMENT = /^\/([a-z]{2})(?=\/|$)/i;

export function stripTracking(url: URL): URL {
  const out = new URL(url);
  for (const key of [...out.searchParams.keys()]) {
    const k = key.toLowerCase();
    if (k.startsWith("utm_") || TRACKING_PARAMS.has(k)) out.searchParams.delete(key);
  }
  return out;
}

/**
 * Returns a clean, India-safe URL for the provider, or null when the link
 * points somewhere it shouldn't (another storefront, another site, http).
 * Prime's `gti` and Apple's `showId`/`playableId` are never touched.
 */
export function safeProviderUrl(provider: Provider, raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();

  switch (provider) {
    case "prv":
      // amazon.com, amazon.co.uk, ... are other storefronts and break in India.
      if (!PRIME_HOSTS.has(host)) return null;
      break;
    case "jhs": {
      if (!HOTSTAR_HOSTS.has(host)) return null;
      const region = url.pathname.match(REGION_SEGMENT)?.[1]?.toLowerCase();
      if (region && region !== "in") return null;
      break;
    }
    case "atp": {
      if (host !== "tv.apple.com") return null;
      // Apple IDs are global, so a wrong region can be rewritten instead of rejected.
      const match = url.pathname.match(REGION_SEGMENT);
      if (!match) url.pathname = "/in" + url.pathname;
      else if (match[1].toLowerCase() !== "in") url.pathname = url.pathname.replace(REGION_SEGMENT, "/in");
      break;
    }
    default:
      return null;
  }

  return stripTracking(url).toString();
}

/** Where to send someone when JustWatch has no usable link for a title. */
export function providerSearchUrl(provider: Provider, title: string): string {
  const q = encodeURIComponent(title);
  switch (provider) {
    case "prv":
      return `https://www.primevideo.com/search/?phrase=${q}`;
    case "jhs":
      return `https://www.hotstar.com/in/explore?search_query=${q}`;
    case "atp":
      return `https://tv.apple.com/in/search?term=${q}`;
  }
}
