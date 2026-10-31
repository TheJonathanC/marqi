/* eslint-disable @next/next/no-img-element -- CDN images, see components/Art.tsx */
import Link from "next/link";
import { getEpisodes, today as getToday } from "@/lib/catalog";
import { posterSet, tmdbStillSet } from "@/lib/images";
import type { SeasonSummary } from "@/lib/justwatch";
import { RowHead } from "./Cards";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function runtime(minutes: number) {
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

/** The season to show when none is picked: the latest regular season that has started. */
function defaultSeason(seasons: SeasonSummary[], year: number) {
  const regular = seasons.filter((s) => s.number > 0);
  const started = regular.filter((s) => s.year !== null && s.year <= year);
  return started[started.length - 1] ?? regular[0] ?? seasons[0];
}

/** JustWatch names unannounced episodes like "Episode #4.1". */
function episodeTitle(title: string, number: number) {
  return /^Episode #\d+\.\d+$/.test(title) ? `Episode ${number}` : title;
}

export async function Seasons({
  titleId,
  tmdbId,
  seasons,
  searchParams,
}: {
  titleId: string;
  tmdbId: string | null;
  seasons: SeasonSummary[];
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (seasons.length === 0) return null;
  const requested = Number((await searchParams).season);
  const today = await getToday();
  const season = seasons.find((s) => s.number === requested) ?? defaultSeason(seasons, Number(today.slice(0, 4)));
  const episodes = await getEpisodes(season.id, tmdbId, season.number).catch(() => []);

  return (
    <section className="seasons" id="episodes" aria-label="Seasons and episodes">
      <RowHead heading="Seasons & Episodes" />
      {seasons.length > 1 && (
        <nav className="season-tabs" aria-label="Seasons">
          {seasons.map((s) => (
            <Link
              key={s.id}
              href={`/title/${titleId}?season=${s.number}#episodes`}
              className="pill"
              aria-current={s.id === season.id ? "true" : undefined}
              scroll={false}
            >
              {s.number === 0 ? "Specials" : `Season ${s.number}`}
            </Link>
          ))}
        </nav>
      )}

      <div className="season-head">
        {season.poster && (
          <img
            {...posterSet(season.poster)}
            sizes="96px"
            alt=""
            width={96}
            height={144}
            loading="lazy"
            decoding="async"
          />
        )}
        <div>
          <h3>{season.title}</h3>
          <div className="meta">
            {season.year && <span>{season.year}</span>}
            {season.episodeCount > 0 && (
              <span>
                {season.episodeCount} episode{season.episodeCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {season.overview && <p>{season.overview}</p>}
        </div>
      </div>

      {episodes.length === 0 ? (
        <p className="row-hint">No episode details for this season yet.</p>
      ) : (
        <ol className="episodes">
          {episodes.map((e) => {
            const upcoming = e.airDate && e.airDate > today;
            return (
              <li key={e.id} className={upcoming ? "episode upcoming" : "episode"}>
                <div className="episode-still">
                  {e.still ? (
                    <img {...tmdbStillSet(e.still)} sizes="200px" alt="" width={300} height={169} loading="lazy" decoding="async" />
                  ) : (
                    <span>{e.number}</span>
                  )}
                </div>
                <div className="episode-body">
                  <h4>
                    <span className="episode-num">{e.number}.</span> {episodeTitle(e.title, e.number)}
                  </h4>
                  <div className="meta">
                    {upcoming ? (
                      <span className="imdb">Coming {dateFmt.format(new Date(e.airDate!))}</span>
                    ) : (
                      e.airDate && <span>{dateFmt.format(new Date(e.airDate))}</span>
                    )}
                    {e.runtime && <span>{runtime(e.runtime)}</span>}
                    {e.rating && (
                      <span className="imdb" title="TMDB rating">
                        ★ {e.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {e.overview && <p>{e.overview}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
