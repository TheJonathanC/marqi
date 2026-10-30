import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Backdrop } from "@/components/Art";
import { Meta } from "@/components/Meta";
import { Ticket } from "@/components/Ticket";
import { getTitle } from "@/lib/catalog";
import { isTitleId } from "@/lib/justwatch";

export async function generateMetadata({ params }: PageProps<"/title/[id]">) {
  const { id } = await params;
  const title = isTitleId(id) ? await getTitle(id).catch(() => null) : null;
  return { title: title?.title ?? "Title" };
}

export default function TitlePage({ params }: PageProps<"/title/[id]">) {
  return (
    <Suspense fallback={<div className="detail"><div className="hero" /></div>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/title/[id]">, "params">) {
  const { id } = await params;
  if (!isTitleId(id)) notFound();
  const title = await getTitle(id);
  if (!title) notFound();

  const overview = title.extras?.overview || title.overview;

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
          <Meta title={title} seasons={title.seasons} />
          {overview && <p className="synopsis">{overview}</p>}
          {title.offers.length ? (
            <div className="actions">
              {title.offers.map((o) => (
                <Ticket key={o.id} offer={o} titleId={title.id} />
              ))}
            </div>
          ) : (
            <p className="unavailable">Not currently showing on Prime Video, JioHotstar or Apple TV in India.</p>
          )}
        </div>
      </section>

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
    </article>
  );
}
