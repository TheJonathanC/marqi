import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Grid } from "@/components/Cards";
import { GridSkeleton } from "@/components/RowsSkeleton";
import { getGenres, getTitles } from "@/lib/catalog";
import {
  IMDB_MINIMUMS,
  SORTS,
  ageBands,
  browseHref,
  certificationsFor,
  isFiltered,
  parseFilters,
  toggle,
  type Filters,
} from "@/lib/filters";
import { languageName } from "@/lib/language";
import { forRow, getProfile, getScope } from "@/lib/personal";
import { PROVIDERS, REGIONS, type ProviderId } from "@/lib/providers";

export const metadata: Metadata = { title: "Browse" };

export default function BrowsePage({ searchParams }: PageProps<"/browse">) {
  return (
    <>
      <div className="page-head">
        <h1>The Programme</h1>
        <Suspense fallback={<p>Everything on your subscriptions. No rentals, no add-on channels.</p>}>
          <BrowseIntro />
        </Suspense>
      </div>
      <Suspense fallback={<GridSkeleton filters={6} />}>
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
  const { catalog, region } = await getScope();
  // Services you haven't chosen, or that aren't in this region (JioHotstar in
  // the UAE), are dropped from the URL's list.
  const f = parseFilters(await searchParams, catalog.providers);
  const [genres, profile, page] = await Promise.all([
    getGenres(),
    getProfile(),
    getTitles({
      ...catalog,
      providers: f.providers.length ? (f.providers as ProviderId[]) : catalog.providers,
      kind: f.kind,
      genres: f.genres,
      ageCertifications: certificationsFor(f.ages, region),
      minImdbScore: f.imdb,
      sort: f.sort,
      after: f.after,
      first: 42,
    }),
  ]);

  const titles = forRow(page.titles, profile, 42);
  const filtered = page.titles.length - titles.length;
  const languages = profile?.prefs.languages ?? [];
  const bands = ageBands(region);

  const pill = (label: string, active: boolean, change: Partial<Filters>, extra?: { p?: string; title?: string }) => (
    <Link
      key={label}
      href={browseHref(f, change)}
      className="pill"
      data-p={extra?.p}
      title={extra?.title}
      aria-current={active ? "true" : undefined}
      scroll={false}
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="filters">
        <div className="filter-group" data-multi>
          <span>Service</span>
          {pill("All", f.providers.length === 0, { providers: [] })}
          {catalog.providers.map((p) =>
            pill(PROVIDERS[p].name, f.providers.includes(p), { providers: toggle(f.providers, p) }, { p }),
          )}
        </div>
        <div className="filter-group">
          <span>Type</span>
          {pill("All", !f.kind, { kind: undefined })}
          {pill("Films", f.kind === "movie", { kind: "movie" })}
          {pill("Series", f.kind === "show", { kind: "show" })}
        </div>
        <div className="filter-group" data-multi>
          <span>Genre</span>
          {pill("Any", f.genres.length === 0, { genres: [] })}
          {genres.map((g) => pill(g.name, f.genres.includes(g.id), { genres: toggle(f.genres, g.id) }))}
        </div>
        <div className="filter-group" data-multi>
          <span>Age</span>
          {pill("Any", f.ages.length === 0, { ages: [] })}
          {bands.map((b) =>
            pill(b.label, f.ages.includes(b.id), { ages: toggle(f.ages, b.id) }, { title: b.name }),
          )}
        </div>
        <div className="filter-group">
          <span>IMDb</span>
          {pill("Any", !f.imdb, { imdb: undefined })}
          {IMDB_MINIMUMS.map((m) => pill(`${m}+`, f.imdb === m, { imdb: m }))}
        </div>
        <div className="filter-group">
          <span>Sort</span>
          {SORTS.map((s) => pill(s.label, f.sort === s.id, { sort: s.id }))}
        </div>
        <p className="filter-help">
          Pick as many services, genres and age ratings as you like: titles matching any of them show up.
          {f.ages.length > 0 && " Titles without an age rating are left out while an age is picked."}
          {isFiltered(f) && (
            <>
              {" "}
              <Link href={browseHref(f, { providers: [], kind: undefined, genres: [], ages: [], imdb: undefined })} scroll={false}>
                Clear filters
              </Link>
            </>
          )}
        </p>
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
        {f.after && <Link href={browseHref(f)}>↺ First page</Link>}
        {page.nextCursor && <Link href={browseHref(f, { after: page.nextCursor })}>Next reel →</Link>}
      </nav>
    </>
  );
}
