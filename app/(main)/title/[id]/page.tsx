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
import { Meta } from "@/components/Meta";
import { Seasons } from "@/components/Seasons";
import { Ticket } from "@/components/Ticket";
import { TrailerButton } from "@/components/Trailer";
import { getSimilar, getTitle } from "@/lib/catalog";
import { isTitleId } from "@/lib/justwatch";
import { forRow, getProfile } from "@/lib/personal";
import { youtubeSearchUrl } from "@/lib/trailer";

export async function generateMetadata({ params }: PageProps<"/title/[id]">) {
  const { id } = await params;
  const title = isTitleId(id) ? await getTitle(id).catch(() => null) : null;
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
  const title = await getTitle(id);
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
              <a className="tool-btn trailer-btn" href={youtubeSearchUrl(title.title, title.year)} target="_blank" rel="noopener">
                ▶ Find trailer
              </a>
            )}
          </div>
          {title.offers.length === 0 && (
            <p className="unavailable">Not currently showing on Prime Video, JioHotstar or Apple TV in India.</p>
          )}
          <Suspense fallback={<div className="title-tools" />}>
            <PersonalTools titleId={title.id} />
          </Suspense>
        </div>
      </section>

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

async function MoreLikeThis({ titleId }: { titleId: string }) {
  const [similar, profile] = await Promise.all([getSimilar(titleId).catch(() => []), getProfile()]);
  return <Row heading="More Like This" titles={forRow(similar, profile)} />;
}
