import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  addToListAction,
  clearWatchAction,
  hideTitleAction,
  markWatchedAction,
  markWatchingAction,
  removeFromListAction,
  unhideTitleAction,
} from "@/app/actions";
import { Backdrop } from "@/components/Art";
import { Row } from "@/components/Cards";
import { Franchise } from "@/components/Franchise";
import { Meta } from "@/components/Meta";
import { Seasons } from "@/components/Seasons";
import { Ticket } from "@/components/Ticket";
import { TrailerButton, TrailerTicketBody } from "@/components/Trailer";
import { getSimilar, getTitle } from "@/lib/catalog";
import { isTitleId } from "@/lib/justwatch";
import { forRow, getProfile, getScope } from "@/lib/personal";
import { REGIONS, REGION_IDS, providerList, resolveScope, type Scope } from "@/lib/providers";
import { youtubeSearchUrl } from "@/lib/trailer";

export async function generateMetadata({ params }: PageProps<"/title/[id]">) {
  const { id } = await params;
  // The name is the same everywhere, so metadata reads the default (shared) entry.
  const title = isTitleId(id) ? await getTitle(id, resolveScope(null).catalog).catch(() => null) : null;
  return { title: title?.title ?? "Title" };
}

export default function TitlePage({ params, searchParams }: PageProps<"/title/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="detail">
          <div className="hero" />
        </div>
      }
    >
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Detail({ params, searchParams }: PageProps<"/title/[id]">) {
  const { id } = await params;
  if (!isTitleId(id)) notFound();
  const scope = await getScope();
  const title = await getTitle(id, scope.catalog);
  if (!title) notFound();

  const overview = title.extras?.overview || title.overview;
  const trailer = title.extras?.trailer ?? title.clipKey;

  return (
    <article className="detail">
      <section className="hero">
        <div className="hero-art">
          <Backdrop tmdbPath={title.extras?.backdrop} template={title.backdrop} priority />
        </div>
        <div className="hero-body">
          <div className="eyebrow">{title.kind === "show" ? "Serial" : "Feature presentation"}</div>
          <h1>{title.title}</h1>
          {title.extras?.tagline && <p className="tagline">{title.extras.tagline}</p>}
          <Meta title={title} seasons={title.seasons} showVotes />
          {overview && <p className="synopsis">{overview}</p>}
          <div className="actions">
            {title.offers.map((o) => (
              <Ticket key={o.id} offer={o} titleId={title.id} />
            ))}
            {trailer ? (
              <TrailerButton videoId={trailer} title={title.title} />
            ) : (
              <a className="ticket ticket-trailer" href={youtubeSearchUrl(title.title, title.year)} target="_blank" rel="noopener">
                <TrailerTicketBody label="Find trailer" />
              </a>
            )}
          </div>
          {title.offers.length === 0 && (
            <>
              <p className="unavailable">
                Not currently showing on {providerList(scope.catalog.providers, "or")} in {REGIONS[scope.region].name}.
              </p>
              <Suspense fallback={null}>
                <Elsewhere titleId={title.id} scope={scope} />
              </Suspense>
            </>
          )}
          <Suspense fallback={<div className="title-tools" />}>
            <PersonalTools titleId={title.id} />
          </Suspense>
        </div>
      </section>

      {title.kind === "movie" && title.tmdbId && (
        <Suspense fallback={null}>
          <Franchise
            titleId={title.id}
            tmdbId={title.tmdbId}
            collectionId={title.extras?.collection?.id ?? null}
            searchParams={searchParams}
          />
        </Suspense>
      )}

      {title.kind === "show" && (
        <Suspense fallback={null}>
          <Seasons titleId={title.id} tmdbId={title.tmdbId} seasons={title.seasonList} searchParams={searchParams} />
        </Suspense>
      )}

      {(title.cast.length > 0 || title.directors.length > 0) && (
        <section className="credits">
          {title.cast.length > 0 && (
            <div>
              <h2>Starring</h2>
              <ul className="cast">
                {title.cast.map((c, i) => (
                  <li key={`${c.name}-${i}`}>
                    {c.name}
                    {c.character && <small>{c.character}</small>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {title.directors.length > 0 && title.kind === "movie" && (
            <div>
              <h2>Directed by</h2>
              <p>{title.directors.join(", ")}</p>
            </div>
          )}
        </section>
      )}

      <div className="rows">
        <Suspense fallback={null}>
          <MoreLikeThis titleId={title.id} />
        </Suspense>
      </div>
    </article>
  );
}

/** Watch state, My List and Not interested, which depend on who's looking. */
async function PersonalTools({ titleId }: { titleId: string }) {
  const profile = await getProfile();
  if (!profile) return null;
  const listed = profile.watchlist.some((w) => w.titleId === titleId);
  const hidden = profile.hidden.some((h) => h.titleId === titleId);
  const status = profile.history.find((h) => h.titleId === titleId)?.status;
  const watching = status === "watching" || status === "pending";
  const watched = status === "finished";

  return (
    <div className="title-tools">
      <form action={watching ? clearWatchAction : markWatchingAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <button type="submit" className="tool-btn" aria-pressed={watching} title="Show in Continue Watching">
          {watching ? "▶ Watching · Undo" : "▶ I'm watching"}
        </button>
      </form>
      <form action={watched ? clearWatchAction : markWatchedAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <button type="submit" className="tool-btn" aria-pressed={watched} title="Counts towards your recommendations">
          {watched ? "✓ Watched · Undo" : "✓ Already watched"}
        </button>
      </form>
      <form action={listed ? removeFromListAction : addToListAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <button type="submit" className="tool-btn" aria-pressed={listed}>
          {listed ? "✓ In My List" : "+ My List"}
        </button>
      </form>
      <form action={hidden ? unhideTitleAction : hideTitleAction}>
        <input type="hidden" name="titleId" value={titleId} />
        <button type="submit" className="tool-btn subtle" aria-pressed={hidden}>
          {hidden ? "Hidden from your rows · Undo" : "Not interested"}
        </button>
      </form>
    </div>
  );
}

/**
 * For a title that isn't on your services here, where it is showing: say, a
 * JioHotstar original looked up from Dubai is "On JioHotstar in India".
 */
async function Elsewhere({ titleId, scope }: { titleId: string; scope: Scope }) {
  const profile = await getProfile();
  const found = await Promise.all(
    REGION_IDS.filter((r) => r !== scope.region).map(async (region) => {
      const { catalog } = resolveScope({ region, providers: profile?.prefs.providers });
      const there = await getTitle(titleId, catalog).catch(() => null);
      return { region, providers: there?.offers.map((o) => o.provider) ?? [] };
    }),
  );
  const hits = found.filter((f) => f.providers.length > 0);
  if (hits.length === 0) return null;
  return (
    <p className="unavailable elsewhere">
      {hits.map((h, i) => (
        <span key={h.region}>
          {i > 0 && " · "}On {providerList(h.providers)} in {REGIONS[h.region].name}
        </span>
      ))}
      {" · "}
      <Link href="/settings#region">Switch region</Link>
    </p>
  );
}

async function MoreLikeThis({ titleId }: { titleId: string }) {
  const { catalog } = await getScope();
  const [similar, profile] = await Promise.all([getSimilar(titleId, catalog).catch(() => []), getProfile()]);
  return <Row heading="More Like This" titles={forRow(similar, profile)} />;
}
