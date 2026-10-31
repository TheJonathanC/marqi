import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  fetchEpisodes,
  fetchGenres,
  fetchSimilar,
  fetchTitle,
  fetchTitles,
  type Episode,
  type Title,
  type TitleQuery,
} from "./justwatch";
import { getTmdbExtras, getTmdbSeason, tmdbConfigured, type TmdbEpisode } from "./tmdb";

// Cached entry points for everything the UI reads. These are shared by every
// user (personal filtering happens per request on top, in lib/personal.ts), so
// they live in the remote cache: one JustWatch call serves every instance.

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

export async function getTitle(id: string) {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("catalog", `title:${id}`);
  const title = await fetchTitle(id);
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

export async function getSimilar(id: string) {
  "use cache: remote";
  cacheLife("days");
  cacheTag("catalog");
  return withLanguages(await fetchSimilar(id));
}

/** Short-lived lookup used at click time, so a title that left a service is caught. */
export async function getFreshOffers(id: string) {
  "use cache";
  cacheLife("minutes");
  return fetchTitle(id);
}

export async function getGenres() {
  "use cache: remote";
  cacheLife("days");
  return fetchGenres();
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
