import { connection } from "next/server";
import { dismissEntry, finishEntry } from "@/app/actions";
import { PROVIDERS } from "@/lib/providers";
import { getViewer } from "@/lib/session";
import { listContinueWatching } from "@/lib/watch";
import { Backdrop } from "./Art";

// Per-user, so it streams in behind a Suspense boundary while the cached
// catalog rows around it render instantly.
export async function ContinueWatching() {
  const user = await getViewer();
  if (!user) return null;
  await connection();
  const entries = await listContinueWatching(user.id).catch((err) => {
    console.error("[marqi] continue watching unavailable", err);
    return [];
  });
  if (entries.length === 0) return null;

  return (
    <section aria-label="Continue Watching">
      <div className="row-head">
        <h2>Continue Watching</h2>
        <span className="deco" aria-hidden />
      </div>
      <div className="row-track wide" data-row>
        {entries.map((e) => (
          <div key={e.titleId} className="cw-card">
            <a href={`/go/${encodeURIComponent(e.offerId)}`} target="_blank" rel="noopener" data-card data-watch={e.titleId}>
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
