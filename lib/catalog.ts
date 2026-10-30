import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { fetchGenres, fetchTitle, fetchTitles, type TitleQuery } from "./justwatch";
import { fetchTmdbExtras } from "./tmdb";

// Cached entry points for everything the UI reads. Catalog data barely
// changes, and caching hard is what keeps us from hammering an unofficial API.

export async function getTitles(q: TitleQuery) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return fetchTitles(q);
}

export async function getTitle(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog", `title:${id}`);
  const title = await fetchTitle(id);
  if (!title) return null;
  const extras = title.tmdbId ? await fetchTmdbExtras(title.kind, title.tmdbId) : null;
  return { ...title, extras };
}

/** Short-lived lookup used at click time, so a title that left a service is caught. */
export async function getFreshOffers(id: string) {
  "use cache";
  cacheLife("minutes");
  return fetchTitle(id);
}

export async function getGenres() {
  "use cache";
  cacheLife("days");
  return fetchGenres();
}
