import type { Offer } from "@/lib/justwatch";
import { PROVIDERS } from "@/lib/providers";

/** The Watch button. Goes through /go so the link is cleaned and the click tracked. */
export function Ticket({ offer, titleId }: { offer: Offer; titleId: string }) {
  const provider = PROVIDERS[offer.provider];
  return (
    <a
      href={`/go/${encodeURIComponent(offer.id)}`}
      target="_blank"
      rel="noopener"
      className="ticket"
      data-watch={titleId}
    >
      <span className="ticket-main">
        <small>Admit one</small>
        Watch on {provider.name}
      </span>
      <span className="ticket-stub">{offer.quality}</span>
    </a>
  );
}
