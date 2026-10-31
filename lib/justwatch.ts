import "server-only";
import { guessLanguage } from "./language";
import { COUNTRY, PROVIDERS, PROVIDER_IDS, isProviderId, type ProviderId } from "./providers";

// JustWatch's GraphQL API is unofficial and can change without notice. Every
// query and every assumption about its shape lives in this file.

const ENDPOINT = "https://apis.justwatch.com/graphql";
const ALLOWED_PACKAGE_IDS = new Set<number>(Object.values(PROVIDERS).map((p) => p.packageId));
const QUALITY_RANK: Record<string, number> = { _4K: 3, HD: 2, SD: 1 };

export type Kind = "movie" | "show";

export type Offer = {
  id: string;
  provider: ProviderId;
  quality: "4K" | "HD" | "SD";
  url: string;
};

export type Title = {
  id: string;
  kind: Kind;
  title: string;
  year: number | null;
  /** JustWatch image path template, see lib/images.ts */
  poster: string | null;
  backdrop: string | null;
  imdbScore: number | null;
  imdbVotes: number | null;
  overview: string;
  genres: string[];
  runtime: number | null;
  certification: string | null;
  tmdbId: string | null;
  imdbId: string | null;
  /** ISO 639-1 original language, null when unknown */
  language: string | null;
  /** One offer per provider, best quality first */
  offers: Offer[];
};

export type Credit = { name: string; character: string | null };

export type TitleDetail = Title & {
  cast: Credit[];
  directors: string[];
  seasons: number | null;
  backdrops: string[];
};

export type Sort = "popular" | "trending" | "imdb" | "new" | "az";

export type TitleQuery = {
  providers?: ProviderId[];
  kind?: Kind;
  genre?: string;
  sort?: Sort;
  search?: string;
  minImdbVotes?: number;
  minImdbScore?: number;
  minYear?: number;
  first?: number;
  after?: string;
};

export type Page = { titles: Title[]; nextCursor: string | null; total: number };

export type Genre = { id: string; name: string };

// --- Raw GraphQL ------------------------------------------------------------

const OFFER_FIELDS = `
  id monetizationType presentationType standardWebURL audioLanguages
  package { packageId shortName }
`;

const TITLE_FIELDS = `
  id objectType
  content(country: $country, language: "en") {
    title originalTitle originalReleaseYear posterUrl shortDescription runtime ageCertification productionCountries
    backdrops { backdropUrl }
    genres { shortName }
    scoring { imdbScore imdbVotes }
    externalIds { tmdbId imdbId }
  }
  offers(country: $country, platform: WEB, filter: { monetizationTypes: [FLATRATE], packages: $packages }) {
    ${OFFER_FIELDS}
  }
`;

const LIST_QUERY = `
  query Titles($country: Country!, $packages: [String!]!, $first: Int!, $after: String, $sortBy: PopularTitlesSorting!, $filter: TitleFilter) {
    popularTitles(country: $country, first: $first, after: $after, sortBy: $sortBy, filter: $filter) {
      totalCount
      pageInfo { endCursor hasNextPage }
      edges { node { ${TITLE_FIELDS} } }
    }
  }
`;

const DETAIL_QUERY = `
  query Title($id: ID!, $country: Country!, $packages: [String!]!) {
    node(id: $id) {
      ... on MovieOrShow {
        ${TITLE_FIELDS}
        content(country: $country, language: "en") { credits { role name characterName } }
      }
      ... on Show { totalSeasonCount }
    }
  }
`;

const SIMILAR_QUERY = `
  query Similar($id: ID!, $country: Country!, $packages: [String!]!, $limit: Int!) {
    node(id: $id) {
      ... on MovieOrShow {
        similarTitles(country: $country, limit: $limit, filter: { packages: $packages, monetizationTypes: [FLATRATE] }) {
          ${TITLE_FIELDS}
        }
      }
    }
  }
`;

const GENRES_QUERY = `query Genres { genres { shortName translation(language: "en") } }`;

type RawOffer = {
  id: string;
  monetizationType: string;
  presentationType: string;
  standardWebURL: string | null;
  audioLanguages?: string[] | null;
  package: { packageId: number; shortName: string };
};

type RawTitle = {
  id: string;
  objectType: "MOVIE" | "SHOW";
  totalSeasonCount?: number;
  content: {
    title: string;
    originalTitle?: string | null;
    productionCountries?: string[] | null;
    originalReleaseYear: number | null;
    posterUrl: string | null;
    shortDescription: string | null;
    runtime: number | null;
    ageCertification: string | null;
    backdrops: { backdropUrl: string }[] | null;
    genres: { shortName: string }[] | null;
    scoring: { imdbScore: number | null; imdbVotes: number | null } | null;
    externalIds: { tmdbId: string | null; imdbId: string | null } | null;
    credits?: { role: string; name: string; characterName: string | null }[];
  };
  offers: RawOffer[] | null;
};

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { country: COUNTRY, ...variables } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`JustWatch responded ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(`JustWatch: ${json.errors[0].message}`);
  if (!json.data) throw new Error("JustWatch returned no data");
  return json.data;
}

// --- Normalisation ----------------------------------------------------------

function normaliseOffers(raw: RawOffer[] | null): Offer[] {
  const best = new Map<ProviderId, RawOffer>();
  for (const o of raw ?? []) {
    // Belt and braces: the query already filters, but never let a rental,
    // purchase or add-on channel through if JustWatch changes behaviour.
    if (o.monetizationType !== "FLATRATE") continue;
    if (!ALLOWED_PACKAGE_IDS.has(o.package.packageId)) continue;
    if (!isProviderId(o.package.shortName) || !o.standardWebURL) continue;
    const current = best.get(o.package.shortName);
    if (!current || (QUALITY_RANK[o.presentationType] ?? 0) > (QUALITY_RANK[current.presentationType] ?? 0)) {
      best.set(o.package.shortName, o);
    }
  }
  return PROVIDER_IDS.flatMap((provider) => {
    const o = best.get(provider);
    if (!o) return [];
    const quality = o.presentationType === "_4K" ? "4K" : o.presentationType === "SD" ? "SD" : "HD";
    return [{ id: o.id, provider, quality, url: o.standardWebURL! }];
  });
}

function normaliseTitle(raw: RawTitle): Title {
  const c = raw.content;
  const audio = (raw.offers ?? [])
    .filter((o) => o.monetizationType === "FLATRATE" && ALLOWED_PACKAGE_IDS.has(o.package.packageId))
    .flatMap((o) => o.audioLanguages ?? []);
  return {
    id: raw.id,
    kind: raw.objectType === "SHOW" ? "show" : "movie",
    title: c.title,
    year: c.originalReleaseYear ?? null,
    poster: c.posterUrl ?? null,
    backdrop: c.backdrops?.[0]?.backdropUrl ?? null,
    imdbScore: c.scoring?.imdbScore ?? null,
    imdbVotes: c.scoring?.imdbVotes ?? null,
    overview: c.shortDescription ?? "",
    genres: (c.genres ?? []).map((g) => g.shortName),
    runtime: c.runtime || null,
    certification: c.ageCertification || null,
    tmdbId: c.externalIds?.tmdbId ?? null,
    imdbId: c.externalIds?.imdbId ?? null,
    language: guessLanguage({
      originalTitle: c.originalTitle,
      productionCountries: c.productionCountries,
      audioLanguages: audio,
    }),
    offers: normaliseOffers(raw.offers),
  };
}

const SORTS: Record<Sort, string> = {
  popular: "POPULAR",
  trending: "TRENDING",
  imdb: "IMDB_SCORE",
  new: "RELEASE_YEAR",
  az: "ALPHABETICAL",
};

// --- Public API -------------------------------------------------------------

export async function fetchTitles(q: TitleQuery): Promise<Page> {
  const packages = q.providers?.length ? q.providers : PROVIDER_IDS;
  const filter: Record<string, unknown> = { packages, monetizationTypes: ["FLATRATE"] };
  if (q.kind) filter.objectTypes = [q.kind === "show" ? "SHOW" : "MOVIE"];
  if (q.genre) filter.genres = [q.genre];
  if (q.search) filter.searchQuery = q.search;
  // Without a vote floor, IMDb sorting surfaces obscure 10/10 titles.
  const minVotes = q.minImdbVotes ?? (q.sort === "imdb" ? 10_000 : undefined);
  if (minVotes) filter.imdbVotes = { min: minVotes };
  if (q.minImdbScore) filter.imdbScore = { min: q.minImdbScore };
  if (q.minYear) filter.releaseYear = { min: q.minYear };

  const data = await gql<{
    popularTitles: {
      totalCount: number;
      pageInfo: { endCursor: string | null; hasNextPage: boolean };
      edges: { node: RawTitle }[];
    };
  }>(LIST_QUERY, {
    packages,
    first: q.first ?? 40,
    after: q.after ?? null,
    sortBy: SORTS[q.sort ?? "popular"],
    filter,
  });

  const { edges, pageInfo, totalCount } = data.popularTitles;
  return {
    titles: edges.map((e) => normaliseTitle(e.node)).filter((t) => t.offers.length > 0),
    nextCursor: pageInfo.hasNextPage ? pageInfo.endCursor : null,
    total: totalCount,
  };
}

export async function fetchTitle(id: string): Promise<TitleDetail | null> {
  const data = await gql<{ node: RawTitle | null }>(DETAIL_QUERY, { id, packages: PROVIDER_IDS });
  const raw = data.node;
  if (!raw?.content) return null;
  const credits = raw.content.credits ?? [];
  return {
    ...normaliseTitle(raw),
    cast: credits
      .filter((c) => c.role === "ACTOR")
      .slice(0, 12)
      .map((c) => ({ name: c.name, character: c.characterName || null })),
    directors: [...new Set(credits.filter((c) => c.role === "DIRECTOR").map((c) => c.name))].slice(0, 3),
    seasons: raw.totalSeasonCount ?? null,
    backdrops: (raw.content.backdrops ?? []).map((b) => b.backdropUrl),
  };
}

export async function fetchSimilar(id: string, limit = 24): Promise<Title[]> {
  const data = await gql<{ node: { similarTitles?: RawTitle[] } | null }>(SIMILAR_QUERY, {
    id,
    packages: PROVIDER_IDS,
    limit,
  });
  return (data.node?.similarTitles ?? []).map(normaliseTitle).filter((t) => t.offers.length > 0);
}

export async function fetchGenres(): Promise<Genre[]> {
  const data = await gql<{ genres: { shortName: string; translation: string }[] }>(GENRES_QUERY, {});
  return data.genres
    .filter((g) => g.shortName !== "eur") // "Made in Europe" isn't a genre
    .map((g) => ({ id: g.shortName, name: g.translation }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Offer IDs are base64 of `of|<titleId>:IN:<provider>:flatrate:<quality>`.
 * Decoding lets /go re-resolve the current URL server-side instead of
 * trusting anything the browser sends.
 */
export function parseOfferId(offerId: string): { titleId: string; provider: ProviderId } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(offerId, "base64").toString("utf8");
  } catch {
    return null;
  }
  const m = decoded.match(/^of\|(t[ms]\d+):IN:([a-z]+):flatrate:[a-z0-9_]+$/i);
  if (!m || !isProviderId(m[2])) return null;
  return { titleId: m[1], provider: m[2] };
}

export function isTitleId(id: string): boolean {
  return /^t[ms]\d+$/.test(id);
}
