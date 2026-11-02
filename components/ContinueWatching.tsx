import Link from "next/link";
import { dismissEntry, finishEntry } from "@/app/actions";
import { PROVIDERS } from "@/lib/providers";
import type { HistoryEntry, Profile } from "@/lib/watch";
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
          Press a <em>Watch</em> ticket, or <em>I&apos;m watching</em> on a title page, and the title lands here
          ready to resume. Come straight back within two minutes of a Watch click and Marqi assumes you were only
          peeking.
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
            {e.offerId && e.provider ? (
              <a
                href={`/go/${encodeURIComponent(e.offerId)}`}
                target="_blank"
                rel="noopener"
                data-card
                data-watch={e.titleId}
              >
                <CwBody entry={e} sub={`Resume on ${PROVIDERS[e.provider].name}`} />
              </a>
            ) : (
              <Link href={`/title/${e.titleId}`} data-card>
                <CwBody entry={e} sub="Not streaming right now" />
              </Link>
            )}
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

function CwBody({ entry, sub }: { entry: HistoryEntry; sub: string }) {
  return (
    <>
      <div className="cw-art">
        <Backdrop template={entry.backdrop} sizes="(max-width: 359px) 78vw, (min-width: 1921px) 14.6vw, 280px" />
      </div>
      <div className="card-title">{entry.title}</div>
      <div className="card-sub">{sub}</div>
    </>
  );
}
