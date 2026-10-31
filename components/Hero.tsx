import Link from "next/link";
import type { Title } from "@/lib/justwatch";
import { Backdrop } from "./Art";
import { Carousel } from "./Carousel";
import { Meta } from "./Meta";
import { Ticket } from "./Ticket";

export type Feature = { title: Title; eyebrow: string };

/** Rotating banners. Only the first backdrop loads eagerly. */
export function Banners({ features }: { features: Feature[] }) {
  if (features.length === 0) return null;
  return (
    <Carousel count={features.length}>
      {features.map(({ title, eyebrow }, i) => (
        <div key={title.id} className="hero banner-slide" aria-roledescription="slide" aria-label={title.title}>
          <div className="hero-art">
            <Backdrop template={title.backdrop} priority={i === 0} />
          </div>
          <div className="hero-body">
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="hero-title">
              <Link href={`/title/${title.id}`} tabIndex={i === 0 ? 0 : -1}>
                {title.title}
              </Link>
            </h2>
            <Meta title={title} />
            <p className="overview">{title.overview}</p>
            <div className="actions">
              {title.offers.map((o) => (
                <Ticket key={o.id} offer={o} titleId={title.id} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </Carousel>
  );
}

export function BannerSkeleton() {
  return (
    <section className="banners" aria-hidden>
      <div className="hero" />
    </section>
  );
}
