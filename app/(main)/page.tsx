import Link from "next/link";
import { Suspense } from "react";
import { setDiscoverAction } from "@/app/actions";
import { Row, type CardTitle } from "@/components/Cards";
import { ContinueWatching } from "@/components/ContinueWatching";
import { BannerSkeleton, Banners, type Feature } from "@/components/Hero";
import { getTitles } from "@/lib/catalog";
import type { Title } from "@/lib/justwatch";
import { languageName } from "@/lib/language";
import { forRow, getDiscoveries, getProfile, getRecommendations, visible } from "@/lib/personal";
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

/** Banners: picks for you first (unless in Discover mode), then trending titles that rate well. */
async function Featured() {
  const profile = await getProfile();
  const [trending, acclaimed] = await Promise.all([
    getTitles({ sort: "trending", first: 40 }),
    getTitles({ sort: "popular", minImdbScore: 7.5, minImdbVotes: 5_000, first: 40 }),
  ]);
  const recs = profile && !profile.prefs.discover ? (await getRecommendations(profile)).forYou : [];

  const features: Feature[] = [];
  const add = (titles: Title[], eyebrow: (t: Title) => string, max: number) => {
    let added = 0;
    for (const t of forRow(titles, profile, 40)) {
      if (features.length >= 6 || added >= max) return;
      if (!t.backdrop || features.some((f) => f.title.id === t.id)) continue;
      features.push({ title: t, eyebrow: eyebrow(t) });
      added++;
    }
  };
  add(recs, () => "Picked for you", 2);
  add(
    trending.titles.filter((t) => (t.imdbScore ?? 0) >= 7),
    () => "Trending tonight",
    3,
  );
  add(acclaimed.titles, (t) => `Critics' pick · IMDb ${t.imdbScore?.toFixed(1)}`, 6);
  add(trending.titles, () => "Now playing", 6);

  return <Banners features={features} />;
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
  const titles: CardTitle[] = visible(
    profile.watchlist.map((w) => ({ ...w, id: w.titleId })),
    profile,
  );
  return <Row heading="My List" titles={titles} href="/list" />;
}

/** For You ⇄ Discover switch, plus a reminder of the language filter. */
function ModeBar({ profile }: { profile: Profile }) {
  const { discover, excludedLanguages } = profile.prefs;
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
      <Link href="/settings" className="mode-langs">
        {excludedLanguages.length
          ? `Hiding ${excludedLanguages.map((l) => languageName(l)).join(", ")}`
          : "Language filter: off"}{" "}
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
        note="Watch or save a few titles and this becomes For You"
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

function RowsSkeleton() {
  return (
    <div className="skeleton-rows" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="skeleton-row">
          {Array.from({ length: 8 }, (_, j) => (
            <div key={j} />
          ))}
        </div>
      ))}
    </div>
  );
}
