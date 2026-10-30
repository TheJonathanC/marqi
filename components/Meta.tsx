import type { Title } from "@/lib/justwatch";

function runtime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function Meta({ title, seasons }: { title: Title; seasons?: number | null }) {
  return (
    <div className="meta">
      {!!title.imdbScore && (
        <span className="imdb">
          IMDb {title.imdbScore.toFixed(1)}
        </span>
      )}
      {!!title.year && <span>{title.year}</span>}
      {title.kind === "show" && seasons ? (
        <span>
          {seasons} season{seasons === 1 ? "" : "s"}
        </span>
      ) : (
        !!title.runtime && <span>{runtime(title.runtime)}</span>
      )}
      {title.certification && <span className="cert">{title.certification}</span>}
    </div>
  );
}
