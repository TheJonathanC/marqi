import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { orderFilms, franchiseName, sagaFor, type FranchiseFilm } from "./franchise";
import {
  fetchEpisodes,
  fetchGenres,
  fetchMovieByTmdbId,
  fetchSimilar,
  fetchTitle,
  fetchTitles,
  type Episode,
  type Title,
  type TitleQuery,
} from "./justwatch";
import type { CatalogScope } from "./providers";
import { getTmdbCollection, getTmdbExtras, getTmdbSeason, tmdbConfigured, type TmdbEpisode } from "./tmdb";

// Cached entry points for everything the UI reads. These are shared by every
// user (personal filtering happens per request on top, in lib/personal.ts), so
// they live in the remote cache: one JustWatch call serves every instance.
// Region and services are part of every call, so each combination is cached
// on its own.

/** Swap the heuristic language for TMDB's exact one when a key is configured. */
async function withLanguages<T extends Title>(titles: T[]): Promise<T[]> {
  if (!tmdbConfigured()) return titles;
  return Promise.all(
    titles.map(async (t) => {
      if (!t.tmdbId) return t;
      const extras = await getTmdbExtras(t.kind, t.tmdbId);
      return extras?.language ? { ...t, language: extras.language } : t;
    }),
  );
}

export async function getTitles(q: TitleQuery) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("catalog");
  const page = await fetchTitles(q);
  return { ...page, titles: await withLanguages(page.titles) };
}

export async function getTitle(id: string, scope: CatalogScope) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("catalog", `title:${id}`);
  const title = await fetchTitle(id, scope);
  if (!title) return null;
  const extras = title.tmdbId ? await getTmdbExtras(title.kind, title.tmdbId) : null;
  return { ...title, language: extras?.language ?? title.language, extras };
}

/** A season's episodes from JustWatch, with TMDB stills and ratings when available. */
export async function getEpisodes(
  seasonId: string,
  tmdbId: string | null,
  seasonNumber: number,
): Promise<(Episode & Partial<TmdbEpisode>)[]> {
  "use cache: remote";
  cacheLife("days");
  cacheTag("catalog", `season:${seasonId}`);
  const [episodes, extras] = await Promise.all([
    fetchEpisodes(seasonId),
    tmdbId ? getTmdbSeason(tmdbId, seasonNumber) : null,
  ]);
  return episodes.map((e) => ({ ...e, ...extras?.[e.number] }));
}

export async function getSimilar(id: string, scope: CatalogScope) {
  "use cache: remote";
  cacheLife("days");
  cacheTag("catalog");
  return withLanguages(await fetchSimilar(id, scope));
}

/** Short-lived lookup used at click time, so a title that left a service is caught. */
export async function getFreshOffers(id: string, scope: CatalogScope) {
  "use cache";
  cacheLife("minutes");
  return fetchTitle(id, scope);
}

export async function getGenres() {
  "use cache: remote";
  cacheLife("days");
  return fetchGenres();
}

export type FranchiseEntry = FranchiseFilm & {
  /** JustWatch title ID; null when JustWatch doesn't list the film */
  id: string | null;
  poster: string | null;
  tmdbPoster: string | null;
  imdbScore: number | null;
  offers: Title["offers"];
};

export type Franchise = {
  name: string;
  /** Set for hand-written sagas, whose watch order is story order */
  note: string | null;
  release: FranchiseEntry[];
  watch: FranchiseEntry[];
  differ: boolean;
};

/**
 * The film series a movie belongs to, in release and watch order: a
 * hand-written saga (lib/franchise.ts) if it's in one, else its TMDB
 * collection. Every film is listed, whether or not it's on your services.
 */
export async function getFranchise(
  tmdbId: string,
  collectionId: string | null,
  scope: CatalogScope,
): Promise<Franchise | null> {
  "use cache: remote";
  cacheLife("days");
  cacheTag("catalog");
  const saga = sagaFor(tmdbId);
  const collection = saga || !collectionId ? null : await getTmdbCollection(collectionId);
  const films = saga
    ? saga.films.map(([id, title]) => ({ tmdbId: id, title, date: null, poster: null }))
    : (collection?.parts ?? []);
  if (films.length < 2) return null;

  const entries = await Promise.all(
    films.map(async (f): Promise<FranchiseEntry> => {
      const jw = await fetchMovieByTmdbId(f.tmdbId, f.title, scope).catch(() => null);
      return {
        tmdbId: f.tmdbId,
        id: jw?.id ?? null,
        title: jw?.title ?? f.title,
        date: f.date,
        year: jw?.year ?? (f.date ? Number(f.date.slice(0, 4)) : null),
        poster: jw?.poster ?? null,
        tmdbPoster: f.poster,
        imdbScore: jw?.imdbScore ?? null,
        offers: jw?.offers ?? [],
      };
    }),
  );
  return {
    name: saga ? saga.name : franchiseName(collection!.name),
    note: saga?.note ?? null,
    ...orderFilms(entries, Boolean(saga)),
  };
}

/** The current year, cached so pages can use it without opting out of prerendering. */
export async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Today's date (YYYY-MM-DD), cached for an hour so pages can compare air dates while prerendering. */
export async function today() {
  "use cache";
  cacheLife("hours");
  return new Date().toISOString().slice(0, 10);
}
