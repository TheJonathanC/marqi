import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getGenres, getSimilar, getTitles } from "./catalog";
import type { Kind, Title } from "./justwatch";
import { getViewer } from "./session";
import { genreAffinity, interacted, pickSeeds, rankCandidates, unexploredGenres, visible, type Seed } from "./taste";
import { loadProfile, type Profile } from "./watch";

// Per-request personalisation on top of the shared catalog cache.

/** The signed-in user's profile, loaded once per request however many components ask. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getViewer();
  if (!user) return null;
  await connection();
  return loadProfile(user.id).catch((err) => {
    console.error("[marqi] profile unavailable", err);
    return null;
  });
});

export { visible };

export type Recommendations = {
  forYou: Title[];
  because: { seed: Seed; titles: Title[] } | null;
};

/**
 * "For You" and "Because you watched…", from the user's seeds' similar titles.
 * With a kind, seeds and results are limited to films or series; the genre
 * profile still uses everything.
 */
export const getRecommendations = cache(async (profile: Profile, kind?: Kind): Promise<Recommendations> => {
  const seedSource = kind
    ? {
        ...profile,
        history: profile.history.filter((h) => h.kind === kind),
        watchlist: profile.watchlist.filter((w) => w.kind === kind),
      }
    : profile;
  const seeds = pickSeeds(seedSource, 5);
  if (seeds.length === 0) return { forYou: [], because: null };
  const ofKind = (titles: Title[]) => (kind ? titles.filter((t) => t.kind === kind) : titles);

  const lists = await Promise.all(
    seeds.map(async (seed) => ({ seed, titles: await getSimilar(seed.titleId).catch(() => [] as Title[]) })),
  );
  const seen = interacted(profile);
  const forYou = markWatched(
    visible(ofKind(rankCandidates(lists, genreAffinity(profile), seen)), profile).slice(0, 18),
    profile,
  );

  const top = lists[0];
  const becauseTitles = markWatched(
    visible(ofKind(top.titles).filter((t) => !seen.has(t.id)), profile).slice(0, 18),
    profile,
  );
  return { forYou, because: becauseTitles.length >= 4 ? { seed: top.seed, titles: becauseTitles } : null };
});

/**
 * Discover mode: well-rated titles in genres the user rarely watches, with
 * everything already seen filtered out. The genre pick rotates daily.
 */
export async function getDiscoveries(profile: Profile, rows = 2) {
  const genres = await getGenres();
  const day = Math.floor(Date.now() / 86_400_000);
  const picks = unexploredGenres(
    genreAffinity(profile),
    genres.map((g) => g.id),
    rows,
    day,
  );
  const seen = interacted(profile);
  return Promise.all(
    picks.map(async (id) => {
      const page = await getTitles({ genre: id, sort: "imdb", minImdbVotes: 5_000, first: 40 });
      return {
        genre: genres.find((g) => g.id === id)?.name ?? id,
        genreId: id,
        titles: markWatched(visible(page.titles.filter((t) => !seen.has(t.id)), profile).slice(0, 18), profile),
      };
    }),
  );
}

/**
 * Flags titles the user has watched, so cards can show (and toggle) a ✓.
 * Signed out, titles stay unflagged and cards show no button.
 */
export function markWatched<T extends { id: string }>(titles: T[], profile: Profile | null): (T & { watched?: boolean })[] {
  if (!profile) return titles;
  const watched = new Set(profile.history.filter((h) => h.status === "finished").map((h) => h.titleId));
  return titles.map((t) => ({ ...t, watched: watched.has(t.id) }));
}

/** Language/hidden filtering, plus in Discover mode anything already seen. */
export function forRow(titles: Title[], profile: Profile | null, limit = 18) {
  let out = visible(titles, profile);
  if (profile?.prefs.discover) {
    const seen = interacted(profile);
    out = out.filter((t) => !seen.has(t.id));
  }
  return markWatched(out.slice(0, limit), profile);
}
