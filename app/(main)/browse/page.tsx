import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Grid } from "@/components/Cards";
import { getGenres, getTitles } from "@/lib/catalog";
import type { Kind, Sort } from "@/lib/justwatch";
import { PROVIDERS, PROVIDER_IDS, isProviderId, type ProviderId } from "@/lib/providers";

export const metadata: Metadata = { title: "Browse" };

const SORTS: { id: Sort; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "trending", label: "Trending" },
  { id: "imdb", label: "Top rated" },
  { id: "new", label: "Newest" },
  { id: "az", label: "A–Z" },
];

type Filters = { provider?: ProviderId; kind?: Kind; genre?: string; sort: Sort; after?: string };

function parse(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const provider = one("provider");
  const kind = one("kind");
  const sort = one("sort");
  const genre = one("genre");
  return {
    provider: isProviderId(provider) ? provider : undefined,
    kind: kind === "movie" || kind === "show" ? kind : undefined,
    genre: genre && /^[a-z]{3}$/.test(genre) ? genre : undefined,
    sort: SORTS.some((s) => s.id === sort) ? (sort as Sort) : "popular",
    after: one("after"),
  };
}

function href(f: Filters, change: Partial<Filters>) {
  const next = { ...f, after: undefined, ...change };
  const params = new URLSearchParams();
  if (next.provider) params.set("provider", next.provider);
  if (next.kind) params.set("kind", next.kind);
  if (next.genre) params.set("genre", next.genre);
  if (next.sort !== "popular") params.set("sort", next.sort);
  if (next.after) params.set("after", next.after);
  const qs = params.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

export default function BrowsePage({ searchParams }: PageProps<"/browse">) {
  return (
    <>
      <div className="page-head">
        <h1>The Programme</h1>
        <p>Everything on your subscriptions in India. No rentals, no add-on channels.</p>
      </div>
      <Suspense fallback={<div className="empty">Rolling the reel…</div>}>
        <Browse searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Browse({ searchParams }: Pick<PageProps<"/browse">, "searchParams">) {
  const f = parse(await searchParams);
  const [genres, page] = await Promise.all([
    getGenres(),
    getTitles({
      providers: f.provider ? [f.provider] : undefined,
      kind: f.kind,
      genre: f.genre,
      sort: f.sort,
      after: f.after,
      first: 42,
    }),
  ]);

  const pill = (label: string, active: boolean, to: string) => (
    <Link key={label} href={to} className="pill" aria-current={active ? "true" : undefined} scroll={false}>
      {label}
    </Link>
  );

  return (
    <>
      <div className="filters">
        <div className="filter-group">
          <span>Service</span>
          {pill("All", !f.provider, href(f, { provider: undefined }))}
          {PROVIDER_IDS.map((p) => pill(PROVIDERS[p].name, f.provider === p, href(f, { provider: p })))}
        </div>
        <div className="filter-group">
          <span>Type</span>
          {pill("All", !f.kind, href(f, { kind: undefined }))}
          {pill("Films", f.kind === "movie", href(f, { kind: "movie" }))}
          {pill("Series", f.kind === "show", href(f, { kind: "show" }))}
        </div>
        <div className="filter-group">
          <span>Genre</span>
          {pill("Any", !f.genre, href(f, { genre: undefined }))}
          {genres.map((g) => pill(g.name, f.genre === g.id, href(f, { genre: g.id })))}
        </div>
        <div className="filter-group">
          <span>Sort</span>
          {SORTS.map((s) => pill(s.label, f.sort === s.id, href(f, { sort: s.id })))}
        </div>
      </div>

      {page.titles.length ? (
        <Grid titles={page.titles} />
      ) : (
        <div className="empty">
          <strong>House is dark</strong>
          Nothing matches those filters.
        </div>
      )}

      <nav className="pager" aria-label="Pages">
        {f.after && <Link href={href(f, {})}>↺ First page</Link>}
        {page.nextCursor && <Link href={href(f, { after: page.nextCursor })}>Next reel →</Link>}
      </nav>
    </>
  );
}
