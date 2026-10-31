// Recommendation maths. Pure functions over a user's profile so they can be
// tested in isolation; lib/personal.ts feeds them real data.
//
// The idea: every interaction is a signal with a weight (finishing something
// counts more than peeking at it, hiding it counts against it). Signals give
// a genre affinity profile and a handful of "seed" titles. Candidates come from
// JustWatch's similar-titles for each seed, and are scored by how many strong
// seeds point at them, how well their genres fit, and their IMDb rating.

type TitleLike = { id: string; genres: string[]; language: string | null; imdbScore: number | null };

type ProfileLike = {
  prefs: { languages: string[] };
  hidden: { titleId: string; genres: string[] }[];
  watchlist: { titleId: string; title: string; genres: string[]; addedAt: string }[];
  history: { titleId: string; title: string; genres: string[]; status: string; clickedAt: string }[];
};

const STATUS_WEIGHT: Record<string, number> = {
  finished: 4,
  watching: 3,
  pending: 2,
  bounced: 0.5,
  dismissed: -1,
};
const LIST_WEIGHT = 2.5;
const HIDDEN_WEIGHT = -2;

export type Seed = { titleId: string; title: string; weight: number };

/** Titles the user has already touched in any way: they never need recommending. */
export function interacted(p: ProfileLike): Set<string> {
  return new Set([
    ...p.history.map((h) => h.titleId),
    ...p.watchlist.map((w) => w.titleId),
    ...p.hidden.map((h) => h.titleId),
  ]);
}

/**
 * Keeps titles in the user's chosen languages (all, if none chosen) and drops
 * titles they hid. Titles of unknown language stay: hiding them would lose
 * good titles over missing data.
 */
export function visible<T extends TitleLike>(titles: T[], p: ProfileLike | null): T[] {
  if (!p) return titles;
  const languages = new Set(p.prefs.languages);
  const hidden = new Set(p.hidden.map((h) => h.titleId));
  return titles.filter(
    (t) => !hidden.has(t.id) && !(languages.size > 0 && t.language && !languages.has(t.language)),
  );
}

/** Genre → affinity in [-1, 1], from every weighted signal. */
export function genreAffinity(p: ProfileLike): Map<string, number> {
  const raw = new Map<string, number>();
  const add = (genres: string[], w: number) => {
    for (const g of genres) raw.set(g, (raw.get(g) ?? 0) + w / Math.max(1, genres.length));
  };
  for (const h of p.history) add(h.genres, STATUS_WEIGHT[h.status] ?? 0);
  for (const w of p.watchlist) add(w.genres, LIST_WEIGHT);
  for (const h of p.hidden) add(h.genres, HIDDEN_WEIGHT);

  const max = Math.max(1e-9, ...[...raw.values()].map(Math.abs));
  return new Map([...raw].map(([g, v]) => [g, v / max]));
}

/** The strongest positive signals, most recent first among equals. */
export function pickSeeds(p: ProfileLike, n = 5): Seed[] {
  const seeds = new Map<string, Seed & { at: string }>();
  const consider = (titleId: string, title: string, weight: number, at: string) => {
    if (weight <= 0.5) return;
    const prev = seeds.get(titleId);
    if (!prev || weight > prev.weight) seeds.set(titleId, { titleId, title, weight, at });
  };
  for (const h of p.history) consider(h.titleId, h.title, STATUS_WEIGHT[h.status] ?? 0, h.clickedAt);
  for (const w of p.watchlist) consider(w.titleId, w.title, LIST_WEIGHT, w.addedAt);
  return [...seeds.values()]
    .sort((a, b) => b.weight - a.weight || b.at.localeCompare(a.at))
    .slice(0, n)
    .map(({ titleId, title, weight }) => ({ titleId, title, weight }));
}

function genreFit(t: TitleLike, affinity: Map<string, number>) {
  if (t.genres.length === 0) return 0;
  return t.genres.reduce((sum, g) => sum + (affinity.get(g) ?? 0), 0) / t.genres.length;
}

/**
 * Ranks candidates from each seed's similar-titles list. A title suggested by
 * several seeds, near the top of their lists, in genres you like and well
 * rated, rises to the top.
 */
export function rankCandidates<T extends TitleLike>(
  lists: { seed: Seed; titles: T[] }[],
  affinity: Map<string, number>,
  exclude: Set<string>,
): T[] {
  const scored = new Map<string, { title: T; score: number }>();
  for (const { seed, titles } of lists) {
    titles.forEach((t, rank) => {
      if (exclude.has(t.id)) return;
      const entry = scored.get(t.id) ?? { title: t, score: 0 };
      entry.score += seed.weight * (1 - (0.5 * rank) / Math.max(1, titles.length));
      scored.set(t.id, entry);
    });
  }
  for (const entry of scored.values()) {
    entry.score += 1.5 * genreFit(entry.title, affinity) + 0.3 * ((entry.title.imdbScore ?? 6.5) - 6.5);
  }
  return [...scored.values()].sort((a, b) => b.score - a.score).map((e) => e.title);
}

/**
 * Genres the user rarely or never watches, for Discover mode. `rotation`
 * (e.g. the day number) varies the pick so Discover doesn't go stale.
 */
export function unexploredGenres(affinity: Map<string, number>, allGenres: string[], n: number, rotation = 0): string[] {
  const cold = allGenres.filter((g) => (affinity.get(g) ?? 0) <= 0.15);
  const pool = cold.length >= n ? cold : allGenres;
  if (pool.length === 0) return [];
  const start = rotation % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, n);
}
