import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { getGenres, getSimilar, getTitles } from "./catalog";
import type { Title } from "./justwatch";
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

/** "For You" and "Because you watched…", from the user's seeds' similar titles. */
export const getRecommendations = cache(async (profile: Profile): Promise<Recommendations> => {
  const seeds = pickSeeds(profile, 5);
  if (seeds.length === 0) return { forYou: [], because: null };

  const lists = await Promise.all(
    seeds.map(async (seed) => ({ seed, titles: await getSimilar(seed.titleId).catch(() => [] as Title[]) })),
  );
  const seen = interacted(profile);
  const forYou = visible(rankCandidates(lists, genreAffinity(profile), seen), profile).slice(0, 18);

  const top = lists[0];
  const becauseTitles = visible(top.titles.filter((t) => !seen.has(t.id)), profile).slice(0, 18);
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
        titles: visible(page.titles.filter((t) => !seen.has(t.id)), profile).slice(0, 18),
      };
    }),
  );
}

/** In Discover mode, also hide anything already seen from regular rows. */
export function forRow(titles: Title[], profile: Profile | null, limit = 18): Title[] {
  let out = visible(titles, profile);
  if (profile?.prefs.discover) {
    const seen = interacted(profile);
    out = out.filter((t) => !seen.has(t.id));
  }
  return out.slice(0, limit);
}
