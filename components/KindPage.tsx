import Link from "next/link";
import { Suspense } from "react";
import { currentYear, getGenres, getTitles } from "@/lib/catalog";
import type { Kind } from "@/lib/justwatch";
import { forRow, getProfile, getRecommendations } from "@/lib/personal";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";
import { genreAffinity, unexploredGenres } from "@/lib/taste";
import type { Profile } from "@/lib/watch";
import { Row } from "./Cards";
import { Featured } from "./Featured";
import { BannerSkeleton } from "./Hero";
import { RowsSkeleton } from "./RowsSkeleton";

// Films and Series: a home page of trays for one kind of title.

const COPY = {
  movie: { plural: "Films", popular: "Popular Films", genreSuffix: "films" },
  show: { plural: "Series", popular: "Popular Series", genreSuffix: "series" },
} as const;

// Fallback genre order when there's no taste profile yet.
const DEFAULT_GENRES: Record<Kind, string[]> = {
  movie: ["act", "cmy", "trl", "drm", "crm", "hrr", "rma", "scf", "ani", "doc"],
  show: ["drm", "crm", "cmy", "trl", "scf", "act", "rly", "doc", "ani", "fnt"],
};
const GENRE_TRAYS = 6;

export function KindPage({ kind }: { kind: Kind }) {
  return (
    <>
      <Suspense fallback={<BannerSkeleton />}>
        <Featured kind={kind} />
      </Suspense>
      <div className="rows">
        <Suspense fallback={<RowsSkeleton />}>
          <Trays kind={kind} />
        </Suspense>
      </div>
    </>
  );
}

async function Trays({ kind }: { kind: Kind }) {
  const copy = COPY[kind];
  const year = await currentYear();
  const [profile, genres, popular, trending, fresh, top, ...byProvider] = await Promise.all([
    getProfile(),
    getGenres(),
    getTitles({ kind, first: 40 }),
    getTitles({ kind, sort: "trending", first: 40 }),
    getTitles({ kind, minYear: year - 1, first: 40 }),
    getTitles({ kind, sort: "imdb", minImdbVotes: 25_000, first: 40 }),
    ...PROVIDER_IDS.map((p) => getTitles({ kind, providers: [p], first: 40 })),
  ]);

  const trays = pickGenres(kind, profile, genres.map((g) => g.id));
  const genreRows = await Promise.all(
    trays.map(async ({ id, liked }) => ({
      id,
      liked,
      name: genres.find((g) => g.id === id)?.name ?? id,
      page: await getTitles({ kind, genre: id, first: 40 }),
    })),
  );

  return (
    <>
      {profile && !profile.prefs.discover && <PersonalTrays kind={kind} profile={profile} />}
      <Row heading={copy.popular} titles={forRow(popular.titles, profile)} href={`/browse?kind=${kind}`} eager />
      <Row heading="Trending This Week" titles={forRow(trending.titles, profile)} href={`/browse?kind=${kind}&sort=trending`} />
      <Row heading="New Releases" titles={forRow(fresh.titles, profile)} href={`/browse?kind=${kind}&sort=new`} />
      <Row heading="IMDb Top Rated" titles={forRow(top.titles, profile)} href={`/browse?kind=${kind}&sort=imdb`} />
      {genreRows.map((g) => (
        <Row
          key={g.id}
          heading={g.name}
          titles={forRow(g.page.titles, profile)}
          href={`/browse?kind=${kind}&genre=${g.id}`}
          note={g.liked === "liked" ? "Because you like it" : g.liked === "new" ? "Off your beaten path" : undefined}
        />
      ))}
      {PROVIDER_IDS.map((p, i) => (
        <Row
          key={p}
          heading={`${copy.plural} at ${PROVIDERS[p].name}`}
          titles={forRow(byProvider[i].titles, profile)}
          href={`/browse?kind=${kind}&provider=${p}`}
        />
      ))}
      <p className="row-hint">
        Seen some of these? Hover a poster and press ✓, or <Link href={`/seen?kind=${kind}`}>run through the
        popular {copy.genreSuffix}</Link> and tick off what you&apos;ve watched.
      </p>
    </>
  );
}

async function PersonalTrays({ kind, profile }: { kind: Kind; profile: Profile }) {
  const { forYou, because } = await getRecommendations(profile, kind);
  return (
    <>
      <Row heading={`${COPY[kind].plural} For You`} titles={forYou} />
      {because && <Row heading={`Because you watched ${because.seed.title}`} titles={because.titles} />}
    </>
  );
}

/**
 * Genre trays: your favourite genres first, topped up with the usual suspects.
 * In Discover mode, genres you rarely watch come first instead.
 */
function pickGenres(kind: Kind, profile: Profile | null, allGenres: string[]) {
  const picks: { id: string; liked?: "liked" | "new" }[] = [];
  const push = (id: string, liked?: "liked" | "new") => {
    if (picks.length < GENRE_TRAYS && !picks.some((p) => p.id === id) && allGenres.includes(id)) picks.push({ id, liked });
  };
  if (profile) {
    const affinity = genreAffinity(profile);
    if (profile.prefs.discover) {
      const day = Math.floor(Date.now() / 86_400_000);
      for (const id of unexploredGenres(affinity, allGenres, 3, day)) push(id, "new");
    } else {
      [...affinity]
        .filter(([, v]) => v > 0.2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .forEach(([id]) => push(id, "liked"));
    }
  }
  for (const id of DEFAULT_GENRES[kind]) push(id);
  return picks;
}
