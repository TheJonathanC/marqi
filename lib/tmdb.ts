import "server-only";
import { cacheLife } from "next/cache";
import type { Kind } from "./justwatch";
import { pickTrailer, type TmdbVideo } from "./trailer";

// Optional enrichment. With TMDB_API_KEY set, every title gets an exact
// original language (which powers the language filter), title pages get a
// trailer, tagline, fuller synopsis and original-resolution backdrops, and
// episodes get stills and ratings. Without it, everything still works off
// JustWatch data and a language heuristic.

export type TmdbExtras = {
  language: string | null;
  tagline: string | null;
  overview: string | null;
  /** TMDB file path such as `/abc.jpg`, see lib/images.ts */
  backdrop: string | null;
  /** YouTube video ID */
  trailer: string | null;
  /** The film series a movie belongs to, e.g. "The Hunger Games Collection" */
  collection: { id: string; name: string } | null;
};

export type TmdbCollection = {
  name: string;
  parts: { tmdbId: string; title: string; date: string | null; poster: string | null }[];
};

export type TmdbEpisode = { still: string | null; rating: number | null; votes: number };

export function tmdbConfigured() {
  return Boolean(process.env.TMDB_API_KEY);
}

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;
  // Accept either a v4 read token (a JWT) or a v3 API key.
  const isToken = key.startsWith("eyJ");
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!isToken) url.searchParams.set("api_key", key);
  try {
    const res = await fetch(url, {
      headers: isToken ? { authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(6_000),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function getTmdbExtras(kind: Kind, tmdbId: string): Promise<TmdbExtras | null> {
  "use cache: remote";
  cacheLife("weeks");
  const data = await tmdb<{
    original_language?: string;
    tagline?: string;
    overview?: string;
    backdrop_path?: string | null;
    videos?: { results?: TmdbVideo[] };
    belongs_to_collection?: { id: number; name: string } | null;
  }>(`/${kind === "show" ? "tv" : "movie"}/${tmdbId}`, {
    language: "en-IN",
    append_to_response: "videos",
    // Videos are otherwise limited to the request language; take regional ones too.
    include_video_language: "en,hi,ml,ta,te,kn,bn,ko,ja,null",
  });
  if (!data) return null;
  return {
    language: data.original_language || null,
    tagline: data.tagline || null,
    overview: data.overview || null,
    backdrop: data.backdrop_path || null,
    trailer: pickTrailer(data.videos?.results ?? [], data.original_language),
    collection: data.belongs_to_collection
      ? { id: String(data.belongs_to_collection.id), name: data.belongs_to_collection.name }
      : null,
  };
}

/** A TMDB collection's films, with release dates. */
export async function getTmdbCollection(id: string): Promise<TmdbCollection | null> {
  "use cache: remote";
  cacheLife("archive");
  const data = await tmdb<{
    name?: string;
    parts?: { id: number; title?: string; release_date?: string; poster_path?: string | null }[];
  }>(`/collection/${encodeURIComponent(id)}`, { language: "en-IN" });
  if (!data?.name || !data.parts) return null;
  return {
    name: data.name,
    parts: data.parts.map((p) => ({
      tmdbId: String(p.id),
      title: p.title ?? "",
      date: /^\d{4}-\d{2}-\d{2}$/.test(p.release_date ?? "") ? p.release_date! : null,
      poster: p.poster_path ?? null,
    })),
  };
}

/** Episode stills and ratings for one season, keyed by episode number. */
export async function getTmdbSeason(tmdbId: string, season: number): Promise<Record<number, TmdbEpisode> | null> {
  "use cache: remote";
  cacheLife("archive");
  const data = await tmdb<{
    episodes?: { episode_number: number; still_path: string | null; vote_average: number; vote_count: number }[];
  }>(`/tv/${tmdbId}/season/${season}`, { language: "en-IN" });
  if (!data?.episodes) return null;
  return Object.fromEntries(
    data.episodes.map((e) => [
      e.episode_number,
      { still: e.still_path, rating: e.vote_count > 0 ? e.vote_average : null, votes: e.vote_count },
    ]),
  );
}
