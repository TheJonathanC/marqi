import Link from "next/link";
import type { Title } from "@/lib/justwatch";
import { Backdrop } from "./Art";
import { Meta } from "./Meta";
import { Ticket } from "./Ticket";

export function Hero({ title, eyebrow }: { title: Title; eyebrow: string }) {
  return (
    <section className="hero" aria-label="Featured">
      <div className="hero-art">
        <Backdrop template={title.backdrop} priority />
      </div>
      <div className="hero-body">
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          <Link href={`/title/${title.id}`}>{title.title}</Link>
        </h1>
        <Meta title={title} />
        <p className="overview" style={{ marginTop: 14 }}>
          {title.overview}
        </p>
        <div className="actions">
          {title.offers.map((o) => (
            <Ticket key={o.id} offer={o} titleId={title.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
