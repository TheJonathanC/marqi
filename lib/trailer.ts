// Picks the best trailer from TMDB's video list. Pure, so it runs under
// `node --test`.

export type TmdbVideo = {
  key: string;
  site: string;
  type: string;
  official?: boolean;
  iso_639_1?: string | null;
  published_at?: string;
  name?: string;
};

const TYPE_RANK: Record<string, number> = { Trailer: 3, Teaser: 2, Clip: 1 };

/**
 * Official YouTube trailers first, then teasers, preferring the title's own
 * language, then English, then anything; newest first among equals.
 */
export function pickTrailer(videos: TmdbVideo[], originalLanguage?: string | null): string | null {
  const langScore = (v: TmdbVideo) =>
    v.iso_639_1 && v.iso_639_1 === originalLanguage ? 2 : v.iso_639_1 === "en" ? 1 : 0;
  const best = videos
    .filter((v) => v.site === "YouTube" && v.key && TYPE_RANK[v.type])
    .sort(
      (a, b) =>
        TYPE_RANK[b.type] - TYPE_RANK[a.type] ||
        Number(!!b.official) - Number(!!a.official) ||
        langScore(b) - langScore(a) ||
        (b.published_at ?? "").localeCompare(a.published_at ?? ""),
    )[0];
  return best?.key ?? null;
}

export function youtubeSearchUrl(title: string, year: number | null) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${year ?? ""} trailer`.trim())}`;
}
