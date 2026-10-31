import { dismissEntry, finishEntry } from "@/app/actions";
import { PROVIDERS } from "@/lib/providers";
import type { Profile } from "@/lib/watch";
import { Backdrop } from "./Art";
import { RowHead } from "./Cards";

// Anything you've opened and not peeked-and-left, finished or removed.
export function ContinueWatching({ profile }: { profile: Profile }) {
  const entries = profile.history.filter((e) => e.status === "watching" || e.status === "pending").slice(0, 20);

  if (entries.length === 0) {
    return (
      <section aria-label="Continue Watching">
        <RowHead heading="Continue Watching" />
        <p className="row-hint">
          Press a <em>Watch</em> ticket and the title lands here, ready to resume. Come straight back within two
          minutes and Marqi assumes you were only peeking.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Continue Watching">
      <RowHead heading="Continue Watching" />
      <div className="row-track wide" data-row>
        {entries.map((e) => (
          <div key={e.titleId} className="cw-card">
            <a
              href={`/go/${encodeURIComponent(e.offerId)}`}
              target="_blank"
              rel="noopener"
              data-card
              data-watch={e.titleId}
            >
              <div className="cw-art">
                <Backdrop template={e.backdrop} sizes="280px" />
              </div>
              <div className="card-title">{e.title}</div>
              <div className="card-sub">Resume on {PROVIDERS[e.provider].name}</div>
            </a>
            <div className="cw-tools">
              <form action={finishEntry}>
                <input type="hidden" name="titleId" value={e.titleId} />
                <button type="submit" title="I finished this" aria-label={`Mark ${e.title} as finished`}>
                  ✓
                </button>
              </form>
              <form action={dismissEntry}>
                <input type="hidden" name="titleId" value={e.titleId} />
                <button type="submit" title="Remove from row" aria-label={`Remove ${e.title}`}>
                  ✕
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
