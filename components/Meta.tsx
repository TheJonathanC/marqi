import type { Title } from "@/lib/justwatch";
import { languageName } from "@/lib/language";

function runtime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function votes(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(n);
}

export function Meta({ title, seasons, showVotes }: { title: Title; seasons?: number | null; showVotes?: boolean }) {
  const language = languageName(title.language);
  const imdb = title.imdbScore ? (
    <>
      <b>IMDb</b> {title.imdbScore.toFixed(1)}
      {showVotes && title.imdbVotes ? <small> · {votes(title.imdbVotes)} votes</small> : null}
    </>
  ) : null;

  return (
    <div className="meta">
      {imdb &&
        (title.imdbId ? (
          <a className="imdb" href={`https://www.imdb.com/title/${title.imdbId}/`} target="_blank" rel="noopener">
            {imdb}
          </a>
        ) : (
          <span className="imdb">{imdb}</span>
        ))}
      {!!title.year && <span>{title.year}</span>}
      {title.kind === "show" && seasons ? (
        <span>
          {seasons} season{seasons === 1 ? "" : "s"}
        </span>
      ) : (
        !!title.runtime && <span>{runtime(title.runtime)}</span>
      )}
      {language && <span>{language}</span>}
      {title.certification && <span className="cert">{title.certification}</span>}
    </div>
  );
}
