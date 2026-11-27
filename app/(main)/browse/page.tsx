import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/RowsSkeleton";
import { Grid } from "@/components/Cards";
import { getGenres, getTitles } from "@/lib/catalog";
import { languageName } from "@/lib/language";
import { forRow, getProfile, getScope } from "@/lib/personal";
import type { Kind, Sort } from "@/lib/justwatch";
import { PROVIDERS, REGIONS, isProviderId, type ProviderId } from "@/lib/providers";

export const metadata: Metadata = { title: "Browse" };

const SORTS: { id: Sort; label: string }[] = [
  { id: "popular", label: "Popular" },
  { id: "trending", label: "Trending" },
  { id: "imdb", label: "Top rated" },
  { id: "new", label: "Newest" },
  { id: "az", label: "A–Z" },
];

const IMDB_MINIMUMS = [6, 7, 8] as const;

type Filters = { provider?: ProviderId; kind?: Kind; genre?: string; imdb?: number; sort: Sort; after?: string };

function parse(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const provider = one("provider");
  const kind = one("kind");
  const sort = one("sort");
  const genre = one("genre");
  const imdb = Number(one("imdb"));
  return {
    provider: isProviderId(provider) ? provider : undefined,
    kind: kind === "movie" || kind === "show" ? kind : undefined,
    genre: genre && /^[a-z]{3}$/.test(genre) ? genre : undefined,
    imdb: IMDB_MINIMUMS.includes(imdb as never) ? imdb : undefined,
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
  if (next.imdb) params.set("imdb", String(next.imdb));
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
        <Suspense fallback={<p>Everything on your subscriptions. No rentals, no add-on channels.</p>}>
          <BrowseIntro />
        </Suspense>
      </div>
      <Suspense fallback={<GridSkeleton filters={5} />}>
        <Browse searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function BrowseIntro() {
  const { region } = await getScope();
  return <p>Everything on your subscriptions in {REGIONS[region].name}. No rentals, no add-on channels.</p>;
}

async function Browse({ searchParams }: Pick<PageProps<"/browse">, "searchParams">) {
  const { catalog } = await getScope();
  const parsed = parse(await searchParams);
  // A service you haven't chosen, or one that isn't in this region (JioHotstar
  // in the UAE), falls back to all of yours.
  const f = parsed.provider && !catalog.providers.includes(parsed.provider) ? { ...parsed, provider: undefined } : parsed;
  const [genres, profile, page] = await Promise.all([
    getGenres(),
    getProfile(),
    getTitles({
      ...catalog,
      providers: f.provider ? [f.provider] : catalog.providers,
      kind: f.kind,
      genre: f.genre,
      minImdbScore: f.imdb,
      sort: f.sort,
      after: f.after,
      first: 42,
    }),
  ]);

  const titles = forRow(page.titles, profile, 42);
  const filtered = page.titles.length - titles.length;
  const languages = profile?.prefs.languages ?? [];

  const pill = (label: string, active: boolean, to: string, provider?: ProviderId) => (
    <Link
      key={label}
      href={to}
      className="pill"
      data-p={provider}
      aria-current={active ? "true" : undefined}
      scroll={false}
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="filters">
        <div className="filter-group">
          <span>Service</span>
          {pill("All", !f.provider, href(f, { provider: undefined }))}
          {catalog.providers.map((p) => pill(PROVIDERS[p].name, f.provider === p, href(f, { provider: p }), p))}
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
          <span>IMDb</span>
          {pill("Any", !f.imdb, href(f, { imdb: undefined }))}
          {IMDB_MINIMUMS.map((m) => pill(`${m}+`, f.imdb === m, href(f, { imdb: m })))}
        </div>
        <div className="filter-group">
          <span>Sort</span>
          {SORTS.map((s) => pill(s.label, f.sort === s.id, href(f, { sort: s.id })))}
        </div>
      </div>

      {filtered > 0 && (
        <p className="filter-note">
          {filtered} hidden on this page
          {languages.length > 0 && <> · showing only {languages.map((l) => languageName(l)).join(", ")}</>} ·{" "}
          <Link href="/settings">Edit filters</Link>
        </p>
      )}

      {titles.length ? (
        <Grid titles={titles} />
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
