import Link from "next/link";
import { getFranchise, today as getToday, type FranchiseEntry } from "@/lib/catalog";
import { ordinal } from "@/lib/franchise";
import { getProfile, getScope } from "@/lib/personal";
import { Poster } from "./Art";
import { ImdbChip, ProviderDots, RowHead } from "./Cards";

/**
 * The film series on a movie's page: every film, numbered in watch order
 * (story order for sagas like Star Wars) or release order, with the film
 * you're on marked and the ones you've seen ticked.
 */
export async function Franchise({
  titleId,
  tmdbId,
  collectionId,
  searchParams,
}: {
  titleId: string;
  tmdbId: string;
  collectionId: string | null;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ catalog }, profile, today, sp] = await Promise.all([getScope(), getProfile(), getToday(), searchParams]);
  const series = await getFranchise(tmdbId, collectionId, catalog).catch(() => null);
  if (!series) return null;

  const byRelease = sp.order === "release" || !series.differ;
  const films = byRelease ? series.release : series.watch;
  const released = new Map(series.release.map((f, i) => [f.tmdbId, i + 1]));
  const watched = new Set(profile?.history.filter((h) => h.status === "finished").map((h) => h.titleId));
  const seen = films.filter((f) => f.id && watched.has(f.id)).length;

  return (
    <section className="franchise" id="series" aria-label={`${series.name} films`}>
      <RowHead heading={series.name}>
        <span className="row-note">
          {films.length} films{seen > 0 && ` · ${seen} watched`}
        </span>
      </RowHead>
      {series.differ && (
        <nav className="season-tabs" aria-label="Order">
          <Link href={`/title/${titleId}#series`} className="pill" aria-current={!byRelease ? "true" : undefined} scroll={false}>
            Watch order
          </Link>
          <Link
            href={`/title/${titleId}?order=release#series`}
            className="pill"
            aria-current={byRelease ? "true" : undefined}
            scroll={false}
          >
            Release order
          </Link>
        </nav>
      )}
      <p className="row-hint franchise-hint">
        {!series.differ
          ? "Watch them in the order they came out."
          : byRelease
            ? "In the order they came out in cinemas."
            : `In story order. ${series.note ?? ""}`}
      </p>
      <ol className="row-track franchise-track" data-row>
        {films.map((f, i) => (
          <FilmCard
            key={f.tmdbId}
            film={f}
            position={i + 1}
            current={f.id === titleId || f.tmdbId === tmdbId}
            watched={f.id ? watched.has(f.id) : false}
            releasedAs={byRelease ? null : (released.get(f.tmdbId) ?? null)}
            upcoming={isUpcoming(f, today)}
          />
        ))}
      </ol>
    </section>
  );
}

function isUpcoming(f: FranchiseEntry, today: string) {
  if (f.date) return f.date > today;
  return f.year === null || f.year > Number(today.slice(0, 4));
}

function FilmCard({
  film,
  position,
  current,
  watched,
  releasedAs,
  upcoming,
}: {
  film: FranchiseEntry;
  position: number;
  current: boolean;
  watched: boolean;
  /** In watch order: which film this was to come out, e.g. 5th */
  releasedAs: number | null;
  upcoming: boolean;
}) {
  const body = (
    <>
      <div className="card-poster">
        {film.poster ? (
          <Poster template={film.poster} alt="" />
        ) : film.tmdbPoster ? (
          <Poster template={film.tmdbPoster} alt="" tmdb />
        ) : (
          <span className="no-art">{film.title}</span>
        )}
        <ImdbChip score={film.imdbScore} />
        <span className="fr-num" aria-hidden>
          {position}
        </span>
        {current && <span className="fr-here">You&apos;re here</span>}
        {watched && (
          <span className="fr-seen" aria-label="Watched">
            ✓
          </span>
        )}
      </div>
      <div className="card-title">
        <span className="visually-hidden">{position}. </span>
        {film.title}
      </div>
      <div className="card-sub">
        {upcoming ? (
          <span className="fr-soon">{film.date || film.year ? `Coming ${film.year}` : "Coming soon"}</span>
        ) : (
          film.year && <span>{film.year}</span>
        )}
        {releasedAs !== null && releasedAs !== position && <span>Released {ordinal(releasedAs)}</span>}
        {!upcoming && (film.offers.length ? <ProviderDots offers={film.offers} /> : <span>Not on your services</span>)}
      </div>
    </>
  );

  return (
    <li
      className="card-wrap fr-film"
      aria-current={current ? "true" : undefined}
      data-away={!upcoming && film.offers.length === 0 ? true : undefined}
    >
      {film.id && !current ? (
        <Link href={`/title/${film.id}`} className="card" data-card>
          {body}
        </Link>
      ) : (
        <div className="card">{body}</div>
      )}
    </li>
  );
}
