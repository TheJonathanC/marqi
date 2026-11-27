// Browse filters: parsing them from the URL, building toggle links, and age
// ratings. Pure, no imports, so they run under `node --test`.
//
// Multi-select filters (services, genres, age ratings) travel as comma lists,
// e.g. /browse?provider=nfx,prv&genre=cmy,rma&age=13,16. A single value is a
// list of one, so older links like /browse?genre=hrr keep working.

export type Kind = "movie" | "show";
export type Sort = "popular" | "trending" | "imdb" | "new" | "az";

export const SORTS: { id: Sort; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "trending", label: "Trending" },
  { id: "imdb", label: "Top rated" },
  { id: "new", label: "Newest" },
  { id: "az", label: "A–Z" },
];

export const IMDB_MINIMUMS = [6, 7, 8] as const;

// --- Age ratings ------------------------------------------------------------

/**
 * Age bands shared by every region, so a choice survives switching between
 * India and the UAE. Each region's certificates map onto them. India uses
 * CBFC certificates; UAE listings mix several systems (G/PG, PG-13/PG-15,
 * plain ages), so all of them are covered.
 */
export const AGE_BANDS = ["all", "7", "13", "16", "18"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

const BAND_NAMES: Record<AgeBand, string> = {
  all: "All ages",
  "7": "Ages 7 and up",
  "13": "Ages 13 and up",
  "16": "Ages 16 and up",
  "18": "Adults only",
};

type Ratings = Record<AgeBand, { label: string; certs: string[] }>;

const RATINGS: Record<string, Ratings> = {
  IN: {
    all: { label: "U", certs: ["U"] },
    "7": { label: "UA 7+", certs: ["UA7+"] },
    // Plain "UA" is the pre-2024 certificate, parental guidance under 12.
    "13": { label: "UA 13+", certs: ["UA", "UA13+"] },
    "16": { label: "UA 16+", certs: ["UA16+"] },
    "18": { label: "A", certs: ["A", "S"] },
  },
  AE: {
    all: { label: "G", certs: ["G"] },
    "7": { label: "PG · 7+", certs: ["PG", "7+"] },
    "13": { label: "PG-13 · 13+", certs: ["PG-13", "12+", "13+"] },
    "16": { label: "PG-15 · 16+", certs: ["PG-15", "15+", "16+"] },
    "18": { label: "18+", certs: ["18+", "R", "21+"] },
  },
};

export function ageBands(region: string) {
  const ratings = RATINGS[region] ?? RATINGS.IN;
  return AGE_BANDS.map((id) => ({ id, label: ratings[id].label, name: BAND_NAMES[id] }));
}

/** JustWatch certificate values for the chosen bands in a region. */
export function certificationsFor(bands: readonly AgeBand[], region: string): string[] {
  const ratings = RATINGS[region] ?? RATINGS.IN;
  return bands.flatMap((b) => ratings[b].certs);
}

// --- URL <-> filters --------------------------------------------------------

export type Filters = {
  providers: string[];
  kind?: Kind;
  genres: string[];
  ages: AgeBand[];
  imdb?: number;
  sort: Sort;
  after?: string;
};

type Params = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return [...new Set(raw.split(",").map((v) => v.trim()).filter(Boolean))];
}

/**
 * Filters from the URL, keeping only valid values. `providers` are limited to
 * `allowed` (your services in this region), in their order.
 */
export function parseFilters(sp: Params, allowed: readonly string[]): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const kind = one("kind");
  const sort = one("sort");
  const imdb = Number(one("imdb"));
  const providers = list(sp.provider);
  const ages = list(sp.age);
  return {
    providers: allowed.filter((p) => providers.includes(p)),
    kind: kind === "movie" || kind === "show" ? kind : undefined,
    genres: list(sp.genre).filter((g) => /^[a-z]{3}$/.test(g)),
    ages: AGE_BANDS.filter((a) => ages.includes(a)),
    imdb: (IMDB_MINIMUMS as readonly number[]).includes(imdb) ? imdb : undefined,
    sort: SORTS.some((s) => s.id === sort) ? (sort as Sort) : "popular",
    after: one("after"),
  };
}

/** The /browse URL for these filters with `change` applied. Any change goes back to the first page. */
export function browseHref(f: Filters, change: Partial<Filters> = {}): string {
  const next: Filters = { ...f, after: undefined, ...change };
  const params = new URLSearchParams();
  if (next.providers.length) params.set("provider", next.providers.join(","));
  if (next.kind) params.set("kind", next.kind);
  if (next.genres.length) params.set("genre", next.genres.join(","));
  if (next.ages.length) params.set("age", next.ages.join(","));
  if (next.imdb) params.set("imdb", String(next.imdb));
  if (next.sort !== "popular") params.set("sort", next.sort);
  if (next.after) params.set("after", next.after);
  // Commas read better than %2C and are safe in a query string.
  const qs = params.toString().replace(/%2C/g, ",");
  return qs ? `/browse?${qs}` : "/browse";
}

/** Adds a value to a multi-select list, or removes it if it's there. */
export function toggle<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/** True when anything narrows the results (sort doesn't). */
export function isFiltered(f: Filters): boolean {
  return Boolean(f.providers.length || f.kind || f.genres.length || f.ages.length || f.imdb);
}
