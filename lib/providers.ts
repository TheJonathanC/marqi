// The services and regions Marqi knows about. Pure data and functions, no
// imports, so they run under `node --test`.
//
// JustWatch package IDs are global: Netflix is 8 and Prime Video 119 in every
// country. Prime's add-on channels (Lionsgate Play, MGM+, ...) have their own
// package IDs, so matching on exactly these strips them out.
export const PROVIDERS = {
  nfx: { id: "nfx", packageId: 8, name: "Netflix", short: "Netflix" },
  prv: { id: "prv", packageId: 119, name: "Prime Video", short: "Prime" },
  jhs: { id: "jhs", packageId: 2336, name: "JioHotstar", short: "Hotstar" },
  atp: { id: "atp", packageId: 350, name: "Apple TV", short: "Apple TV" },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

/**
 * Where you're watching from. Each region lists the services that exist
 * there: JioHotstar is India-only, so it isn't offered in the UAE at all.
 */
export const REGIONS = {
  IN: { id: "IN", name: "India", short: "India", providers: ["nfx", "prv", "jhs", "atp"] },
  AE: { id: "AE", name: "the UAE", short: "UAE", providers: ["nfx", "prv", "atp"] },
} as const satisfies Record<string, { id: string; name: string; short: string; providers: readonly ProviderId[] }>;

export type RegionId = keyof typeof REGIONS;

export const REGION_IDS = Object.keys(REGIONS) as RegionId[];

export const DEFAULT_REGION: RegionId = "IN";

export function isRegionId(value: unknown): value is RegionId {
  return typeof value === "string" && value in REGIONS;
}

export function inRegion(provider: ProviderId, region: RegionId): boolean {
  return (REGIONS[region].providers as readonly ProviderId[]).includes(provider);
}

/** The regions a service is available in, e.g. JioHotstar → India. */
export function regionsFor(provider: ProviderId): RegionId[] {
  return REGION_IDS.filter((r) => inRegion(provider, r));
}

/** What the catalog is asked for: a country and the services to include. Part of every cache key. */
export type CatalogScope = { country: RegionId; providers: ProviderId[] };

export type Scope = {
  region: RegionId;
  catalog: CatalogScope;
  /** Chosen services that don't exist in this region (JioHotstar in the UAE) */
  unavailable: ProviderId[];
  /** Every chosen service is missing here, so all of the region's services are shown instead */
  fallback: boolean;
};

/**
 * Turns saved preferences into what to show. The platform choice is kept as
 * saved whatever the region: in the UAE JioHotstar is skipped, and it's back
 * on its own once you switch to India again.
 */
export function resolveScope(prefs?: { region?: string | null; providers?: readonly string[] } | null): Scope {
  const region = isRegionId(prefs?.region) ? prefs.region : DEFAULT_REGION;
  const chosen = PROVIDER_IDS.filter((p) => prefs?.providers?.includes(p));
  const here = PROVIDER_IDS.filter((p) => inRegion(p, region));
  const usable = chosen.filter((p) => inRegion(p, region));
  const fallback = chosen.length > 0 && usable.length === 0;
  return {
    region,
    catalog: { country: region, providers: usable.length ? usable : here },
    unavailable: chosen.filter((p) => !inRegion(p, region)),
    fallback,
  };
}

/** "Netflix, Prime Video and Apple TV" */
export function providerList(ids: readonly ProviderId[], joiner = "and"): string {
  const names = ids.map((p) => PROVIDERS[p].name);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} ${joiner} ${names.at(-1)}`;
}

// Coming back to Marqi within this long after a Watch click counts as a peek,
// and the title drops out of Continue Watching.
export const BOUNCE_MINUTES = 2;
