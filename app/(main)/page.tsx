import { Suspense } from "react";
import { Row } from "@/components/Cards";
import { ContinueWatching } from "@/components/ContinueWatching";
import { Hero } from "@/components/Hero";
import { getTitles } from "@/lib/catalog";
import { PROVIDERS, PROVIDER_IDS } from "@/lib/providers";

export default function Home() {
  return (
    <>
      <Featured />
      <div className="rows">
        <Suspense fallback={null}>
          <ContinueWatching />
        </Suspense>
        <CatalogRows />
      </div>
    </>
  );
}

async function Featured() {
  const { titles } = await getTitles({ sort: "trending", first: 12 });
  const featured = titles.find((t) => t.backdrop) ?? titles[0];
  return featured ? <Hero title={featured} eyebrow="Tonight's feature" /> : null;
}

async function CatalogRows() {
  const [films, series, top, ...byProvider] = await Promise.all([
    getTitles({ kind: "movie", first: 18 }),
    getTitles({ kind: "show", first: 18 }),
    getTitles({ sort: "imdb", minImdbVotes: 50_000, first: 18 }),
    ...PROVIDER_IDS.map((p) => getTitles({ providers: [p], first: 18 })),
  ]);

  return (
    <>
      <Row heading="Now Showing" titles={films.titles} href="/browse?kind=movie" eager />
      <Row heading="Serials" titles={series.titles} href="/browse?kind=show" />
      <Row heading="Critics' Circle" titles={top.titles} href="/browse?sort=imdb" />
      {PROVIDER_IDS.map((p, i) => (
        <Row
          key={p}
          heading={`Playing at ${PROVIDERS[p].name}`}
          titles={byProvider[i].titles}
          href={`/browse?provider=${p}`}
        />
      ))}
    </>
  );
}
