import "server-only";
import { getDb } from "./db";
import { DWELL_MINUTES, type ProviderId } from "./providers";
import type { SessionUser } from "./session";
import type { Kind } from "./justwatch";

// Continue Watching state machine, one row per (user, title):
//
//   click Watch ──► pending ──(tab hidden ≥ DWELL)──► watching
//                      │                                 │
//                      └──(back quickly)──► bounced      ├─► finished  (✓)
//                                                        └─► dismissed (✕)
//
// A pending click that never reports back (tab closed) counts as watching
// once it is older than the dwell threshold.

export type WatchEntry = {
  titleId: string;
  kind: Kind;
  title: string;
  poster: string | null;
  backdrop: string | null;
  provider: ProviderId;
  offerId: string;
};

const DWELL_MS = DWELL_MINUTES * 60_000;

export async function upsertUser(user: SessionUser) {
  const db = await getDb();
  await db?.query(
    `insert into users (id, login, name, avatar_url) values ($1, $2, $3, $4)
     on conflict (id) do update set login = excluded.login, name = excluded.name,
       avatar_url = excluded.avatar_url, last_login_at = now()`,
    [user.id, user.login, user.name, user.avatarUrl],
  );
}

export async function recordClick(userId: string, e: WatchEntry) {
  const db = await getDb();
  await db?.query(
    `insert into watch_entries (user_id, title_id, kind, title, poster, backdrop, provider, offer_id, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     on conflict (user_id, title_id) do update set
       kind = excluded.kind, title = excluded.title, poster = excluded.poster,
       backdrop = excluded.backdrop, provider = excluded.provider, offer_id = excluded.offer_id,
       status = case when watch_entries.status = 'watching' then 'watching' else 'pending' end,
       clicked_at = now()`,
    [userId, e.titleId, e.kind, e.title, e.poster, e.backdrop, e.provider, e.offerId],
  );
}

/** Called when the Marqi tab becomes visible again after a Watch click. */
export async function recordReturn(userId: string, titleId: string, awayMs: number) {
  const db = await getDb();
  if (awayMs >= DWELL_MS) {
    await db?.query(
      `update watch_entries set status = 'watching', watched_at = now()
       where user_id = $1 and title_id = $2 and status in ('pending', 'bounced', 'watching')`,
      [userId, titleId],
    );
  } else {
    await db?.query(
      `update watch_entries set status = 'bounced'
       where user_id = $1 and title_id = $2 and status = 'pending'`,
      [userId, titleId],
    );
  }
}

export async function setStatus(userId: string, titleId: string, status: "finished" | "dismissed") {
  const db = await getDb();
  await db?.query(`update watch_entries set status = $3 where user_id = $1 and title_id = $2`, [
    userId,
    titleId,
    status,
  ]);
}

export async function listContinueWatching(userId: string, limit = 20): Promise<WatchEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.query<{
    title_id: string;
    kind: Kind;
    title: string;
    poster: string | null;
    backdrop: string | null;
    provider: ProviderId;
    offer_id: string;
  }>(
    `select title_id, kind, title, poster, backdrop, provider, offer_id from watch_entries
     where user_id = $1
       and (status = 'watching'
            or (status = 'pending' and clicked_at < now() - make_interval(secs => $2)))
     order by greatest(clicked_at, coalesce(watched_at, clicked_at)) desc
     limit $3`,
    [userId, DWELL_MS / 1000, limit],
  );
  return rows.map((r) => ({
    titleId: r.title_id,
    kind: r.kind,
    title: r.title,
    poster: r.poster,
    backdrop: r.backdrop,
    provider: r.provider,
    offerId: r.offer_id,
  }));
}
