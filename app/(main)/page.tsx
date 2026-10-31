import Link from "next/link";
import { Suspense } from "react";
import { setDiscoverAction } from "@/app/actions";
import { Row, type CardTitle } from "@/components/Cards";
import { ContinueWatching } from "@/components/ContinueWatching";
import { Featured } from "@/components/Featured";
import { BannerSkeleton } from "@/components/Hero";
import { RowsSkeleton } from "@/components/RowsSkeleton";
import { getTitles } from "@/lib/catalog";
import { languageName } from "@/lib/language";
import { forRow, getDiscoveries, getProfile, getRecommendations, markWatched, visible } from "@/lib/personal";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";
import type { Profile } from "@/lib/watch";

export default function Home() {
  return (
    <>
      <Suspense fallback={<BannerSkeleton />}>
        <Featured />
      </Suspense>
      <div className="rows">
        <Suspense fallback={<RowsSkeleton />}>
          <HomeRows />
        </Suspense>
      </div>
    </>
  );
}

async function HomeRows() {
  const profile = await getProfile();
  const [films, series, top, ...byProvider] = await Promise.all([
    getTitles({ kind: "movie", first: 40 }),
    getTitles({ kind: "show", first: 40 }),
    getTitles({ sort: "imdb", minImdbVotes: 50_000, first: 40 }),
    ...PROVIDER_IDS.map((p) => getTitles({ providers: [p], first: 40 })),
  ]);

  return (
    <>
      {profile && <ContinueWatching profile={profile} />}
      {profile && <MyListRow profile={profile} />}
      {profile && <ModeBar profile={profile} />}
      {profile && (profile.prefs.discover ? <DiscoverRows profile={profile} /> : <ForYouRows profile={profile} />)}

      <Row heading="Now Showing" titles={forRow(films.titles, profile)} href="/browse?kind=movie" eager />
      <Row heading="Serials" titles={forRow(series.titles, profile)} href="/browse?kind=show" />
      <Row heading="IMDb Top Rated" titles={forRow(top.titles, profile)} href="/browse?sort=imdb" />
      {PROVIDER_IDS.map((p, i) => (
        <Row
          key={p}
          heading={`Playing at ${PROVIDERS[p].name}`}
          titles={forRow(byProvider[i].titles, profile)}
          href={`/browse?provider=${p}`}
        />
      ))}
    </>
  );
}

function MyListRow({ profile }: { profile: Profile }) {
  const titles: CardTitle[] = markWatched(
    visible(
      profile.watchlist.map((w) => ({ ...w, id: w.titleId })),
      profile,
    ),
    profile,
  );
  return <Row heading="My List" titles={titles} href="/list" />;
}

/** For You ⇄ Discover switch, plus a reminder of the language filter. */
function ModeBar({ profile }: { profile: Profile }) {
  const { discover, languages } = profile.prefs;
  return (
    <div className="mode-bar">
      <form action={setDiscoverAction} className="mode-switch" aria-label="Recommendations mode">
        <button name="discover" value="off" aria-pressed={!discover}>
          For You
        </button>
        <button name="discover" value="on" aria-pressed={discover}>
          Discover
        </button>
      </form>
      <span className="mode-help">
        {discover
          ? "Off your usual path: no recommendations, nothing you've seen."
          : "Suggestions from what you watch and save."}
      </span>
      <Link href="/seen" className="mode-langs">
        Mark what you&apos;ve seen
      </Link>
      <Link href="/settings" className="mode-langs">
        {languages.length ? `Showing ${languages.map((l) => languageName(l)).join(", ")}` : "All languages"}{" "}
        · Edit
      </Link>
    </div>
  );
}

async function ForYouRows({ profile }: { profile: Profile }) {
  const { forYou, because } = await getRecommendations(profile);
  if (forYou.length === 0) {
    const starter = await getTitles({ sort: "trending", minImdbScore: 7, minImdbVotes: 5_000, first: 40 });
    return (
      <Row
        heading="Start Here"
        titles={forRow(starter.titles, profile)}
        note={
          <>
            Watch or save a few titles and this becomes For You, or <Link href="/seen">mark what you&apos;ve seen</Link>
          </>
        }
      />
    );
  }
  return (
    <>
      <Row heading="For You" titles={forYou} />
      {because && <Row heading={`Because you watched ${because.seed.title}`} titles={because.titles} />}
    </>
  );
}

async function DiscoverRows({ profile }: { profile: Profile }) {
  const rows = await getDiscoveries(profile, 2);
  return (
    <>
      {rows.map((r) => (
        <Row
          key={r.genreId}
          heading={`Off the Beaten Path · ${r.genre}`}
          titles={r.titles}
          href={`/browse?genre=${r.genreId}&sort=imdb`}
        />
      ))}
    </>
  );
}
