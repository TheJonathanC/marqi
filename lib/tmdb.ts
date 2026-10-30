import "server-only";
import type { Kind } from "./justwatch";

// Optional enrichment. With TMDB_API_KEY set, title pages get a tagline, a
// fuller synopsis and original-resolution backdrops. Without it, everything
// still works off JustWatch data.

export type TmdbExtras = {
  tagline: string | null;
  overview: string | null;
  /** TMDB file path such as `/abc.jpg`, see lib/images.ts */
  backdrop: string | null;
};

export async function fetchTmdbExtras(kind: Kind, tmdbId: string): Promise<TmdbExtras | null> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return null;

  // Accept either a v4 read token (a JWT) or a v3 API key.
  const isToken = key.startsWith("eyJ");
  const url = new URL(`https://api.themoviedb.org/3/${kind === "show" ? "tv" : "movie"}/${tmdbId}`);
  url.searchParams.set("language", "en-IN");
  if (!isToken) url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url, {
      headers: isToken ? { authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tagline?: string; overview?: string; backdrop_path?: string | null };
    return {
      tagline: data.tagline || null,
      overview: data.overview || null,
      backdrop: data.backdrop_path || null,
    };
  } catch {
    return null;
  }
}
