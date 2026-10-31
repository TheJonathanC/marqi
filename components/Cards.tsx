import Link from "next/link";
import type { ReactNode } from "react";
import type { Offer } from "@/lib/justwatch";
import { languageName } from "@/lib/language";
import { PROVIDERS } from "@/lib/providers";
import { Poster } from "./Art";

/** What a poster card needs; satisfied by catalog titles and My List entries. */
export type CardTitle = {
  id: string;
  title: string;
  poster: string | null;
  year: number | null;
  imdbScore: number | null;
  language: string | null;
  offers?: Offer[];
  /** Set when signed in: shows the ✓ watched toggle in that state */
  watched?: boolean;
};

export function ImdbChip({ score }: { score: number | null }) {
  if (!score) return null;
  return (
    <span className="imdb-chip" aria-label={`IMDb ${score.toFixed(1)}`}>
      <b>IMDb</b> {score.toFixed(1)}
    </span>
  );
}

export function PosterCard({ title, eager }: { title: CardTitle; eager?: boolean }) {
  const language = languageName(title.language);
  return (
    <div className="card-wrap">
      <Link href={`/title/${title.id}`} className="card" data-card>
        <div className="card-poster">
          {title.poster ? (
            <Poster template={title.poster} alt="" eager={eager} />
          ) : (
            <span className="no-art">{title.title}</span>
          )}
          <ImdbChip score={title.imdbScore} />
        </div>
        <div className="card-title">{title.title}</div>
        <div className="card-sub">
          {!!title.year && <span>{title.year}</span>}
          {language && <span>{language}</span>}
          {title.offers && <ProviderDots offers={title.offers} />}
        </div>
      </Link>
      {title.watched !== undefined && (
        // Handled by LauncherScripts: one delegated listener for every card.
        <button
          type="button"
          className="seen-btn"
          data-seen={title.id}
          aria-pressed={title.watched}
          aria-label={title.watched ? `Watched ${title.title}. Undo` : `Mark ${title.title} as watched`}
          title={title.watched ? "Watched · click to undo" : "Already watched"}
        >
          ✓
        </button>
      )}
    </div>
  );
}

export function ProviderDots({ offers }: { offers: Offer[] }) {
  const names = offers.map((o) => PROVIDERS[o.provider].name).join(", ");
  return (
    <span className="badges" title={names} aria-label={`On ${names}`}>
      {offers.map((o) => (
        <span key={o.provider} className="badge" data-p={o.provider} />
      ))}
    </span>
  );
}

export function RowHead({ heading, href, children }: { heading: string; href?: string; children?: ReactNode }) {
  return (
    <div className="row-head">
      <h2>{heading}</h2>
      <span className="deco" aria-hidden />
      {children}
      {href && <Link href={href}>See all →</Link>}
    </div>
  );
}

export function Row({
  heading,
  titles,
  href,
  eager,
  note,
}: {
  heading: string;
  titles: CardTitle[];
  href?: string;
  eager?: boolean;
  note?: ReactNode;
}) {
  if (titles.length === 0) return null;
  return (
    <section aria-label={heading}>
      <RowHead heading={heading} href={href}>
        {note && <span className="row-note">{note}</span>}
      </RowHead>
      <div className="row-track" data-row>
        {titles.map((t, i) => (
          <PosterCard key={t.id} title={t} eager={eager && i < 8} />
        ))}
      </div>
    </section>
  );
}

export function Grid({ titles }: { titles: CardTitle[] }) {
  return (
    <div className="grid" data-row>
      {titles.map((t) => (
        <PosterCard key={t.id} title={t} />
      ))}
    </div>
  );
}
