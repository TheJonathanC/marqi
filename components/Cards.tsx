import Link from "next/link";
import type { Title } from "@/lib/justwatch";
import { PROVIDERS } from "@/lib/providers";
import { Poster } from "./Art";

export function PosterCard({ title, eager }: { title: Title; eager?: boolean }) {
  return (
    <Link href={`/title/${title.id}`} className="card" data-card>
      <div className="card-poster">
        {title.poster ? (
          <Poster template={title.poster} alt="" eager={eager} />
        ) : (
          <span className="no-art">{title.title}</span>
        )}
      </div>
      <div className="card-title">{title.title}</div>
      <div className="card-sub">
        {!!title.year && <span>{title.year}</span>}
        {!!title.imdbScore && <span className="imdb">★ {title.imdbScore.toFixed(1)}</span>}
        <ProviderDots title={title} />
      </div>
    </Link>
  );
}

export function ProviderDots({ title }: { title: Title }) {
  const names = title.offers.map((o) => PROVIDERS[o.provider].name).join(", ");
  return (
    <span className="badges" title={names} aria-label={`On ${names}`}>
      {title.offers.map((o) => (
        <span key={o.provider} className="badge" data-p={o.provider} />
      ))}
    </span>
  );
}

export function Row({
  heading,
  titles,
  href,
  eager,
}: {
  heading: string;
  titles: Title[];
  href?: string;
  eager?: boolean;
}) {
  if (titles.length === 0) return null;
  return (
    <section aria-label={heading}>
      <div className="row-head">
        <h2>{heading}</h2>
        <span className="deco" aria-hidden />
        {href && <Link href={href}>See all →</Link>}
      </div>
      <div className="row-track" data-row>
        {titles.map((t, i) => (
          <PosterCard key={t.id} title={t} eager={eager && i < 8} />
        ))}
      </div>
    </section>
  );
}

export function Grid({ titles }: { titles: Title[] }) {
  return (
    <div className="grid" data-row>
      {titles.map((t) => (
        <PosterCard key={t.id} title={t} />
      ))}
    </div>
  );
}
