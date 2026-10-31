import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Grid } from "@/components/Cards";
import { getTitles } from "@/lib/catalog";
import type { Kind } from "@/lib/justwatch";
import { getProfile, markWatched, visible } from "@/lib/personal";

export const metadata: Metadata = { title: "Mark what you've seen" };

// A quick run through popular titles to tick off what you've already watched,
// so recommendations have something to go on without opening every title.
export default function SeenPage({ searchParams }: PageProps<"/seen">) {
  return (
    <>
      <div className="page-head">
        <h1>Mark what you&apos;ve seen</h1>
        <p>Press ✓ on anything you&apos;ve already watched. It sharpens For You and keeps those titles out of it.</p>
      </div>
      <Suspense fallback={<div className="empty">Rolling the reel…</div>}>
        <Seen searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Seen({ searchParams }: Pick<PageProps<"/seen">, "searchParams">) {
  const sp = await searchParams;
  const kind: Kind = sp.kind === "show" ? "show" : "movie";
  const sort = sp.sort === "imdb" ? "imdb" : "popular";
  const after = typeof sp.after === "string" ? sp.after : undefined;

  const [profile, page] = await Promise.all([
    getProfile(),
    getTitles({ kind, sort, minImdbVotes: sort === "imdb" ? 50_000 : undefined, after, first: 42 }),
  ]);
  const titles = markWatched(visible(page.titles, profile), profile);
  const watched = profile?.history.filter((h) => h.status === "finished").length ?? 0;
  const href = (k: Kind, s: string, a?: string) =>
    `/seen?kind=${k}${s !== "popular" ? `&sort=${s}` : ""}${a ? `&after=${encodeURIComponent(a)}` : ""}`;

  return (
    <>
      <div className="filters">
        <div className="filter-group">
          <span>Show</span>
          <Link className="pill" href={href("movie", sort)} aria-current={kind === "movie" ? "true" : undefined}>
            Films
          </Link>
          <Link className="pill" href={href("show", sort)} aria-current={kind === "show" ? "true" : undefined}>
            Series
          </Link>
        </div>
        <div className="filter-group">
          <span>From</span>
          <Link className="pill" href={href(kind, "popular")} aria-current={sort === "popular" ? "true" : undefined}>
            Popular now
          </Link>
          <Link className="pill" href={href(kind, "imdb")} aria-current={sort === "imdb" ? "true" : undefined}>
            All-time greats
          </Link>
        </div>
      </div>
      <p className="filter-note">{watched} titles marked as watched so far</p>
      <Grid titles={titles} />
      <nav className="pager" aria-label="Pages">
        {after && <Link href={href(kind, sort)}>↺ First page</Link>}
        {page.nextCursor && <Link href={href(kind, sort, page.nextCursor)}>Next reel →</Link>}
      </nav>
    </>
  );
}
