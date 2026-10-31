import "server-only";
import { getDb } from "./db";
import { BOUNCE_MINUTES, type ProviderId } from "./providers";
import type { SessionUser } from "./session";
import type { Kind, Title } from "./justwatch";

// Continue Watching state machine, one row per (user, title):
//
//   click Watch ──► pending ──(back after ≥ BOUNCE)──► watching
//                      │                                  │
//                      └──(back within BOUNCE)──► bounced ├─► finished  (✓)
//                                                         └─► dismissed (✕)
//
// Pending titles show in Continue Watching straight away; coming back within
// the bounce window means you only peeked, so the title drops out again.

export type WatchStatus = "pending" | "bounced" | "watching" | "finished" | "dismissed";

export type WatchEntry = {
  titleId: string;
  kind: Kind;
  title: string;
  poster: string | null;
  backdrop: string | null;
  provider: ProviderId;
  offerId: string;
  genres: string[];
  language: string | null;
};

export type HistoryEntry = WatchEntry & { status: WatchStatus; clickedAt: string };

export type ListEntry = {
  titleId: string;
  kind: Kind;
  title: string;
  poster: string | null;
  backdrop: string | null;
  year: number | null;
  imdbScore: number | null;
  genres: string[];
  language: string | null;
  addedAt: string;
};

export type Prefs = { excludedLanguages: string[]; discover: boolean };

export type Profile = {
  prefs: Prefs;
  hidden: { titleId: string; title: string; genres: string[] }[];
  watchlist: ListEntry[];
  history: HistoryEntry[];
};

const BOUNCE_MS = BOUNCE_MINUTES * 60_000;

// Arrays travel as JSON text and get unpacked in SQL. The parameter is typed
// as text on purpose: typed as jsonb, postgres.js JSON-encodes the string a
// second time and Postgres receives a scalar instead of an array.
const TEXT_ARRAY = (n: number) => `array(select jsonb_array_elements_text($${n}::text::jsonb))`;

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
    `insert into watch_entries (user_id, title_id, kind, title, poster, backdrop, provider, offer_id, genres, language, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, ${TEXT_ARRAY(9)}, $10, 'pending')
     on conflict (user_id, title_id) do update set
       kind = excluded.kind, title = excluded.title, poster = excluded.poster,
       backdrop = excluded.backdrop, provider = excluded.provider, offer_id = excluded.offer_id,
       genres = excluded.genres, language = excluded.language,
       status = case when watch_entries.status = 'watching' then 'watching' else 'pending' end,
       clicked_at = now()`,
    [userId, e.titleId, e.kind, e.title, e.poster, e.backdrop, e.provider, e.offerId, JSON.stringify(e.genres), e.language],
  );
}

/** Called when the Marqi tab becomes visible again after a Watch click. */
export async function recordReturn(userId: string, titleId: string, awayMs: number) {
  const db = await getDb();
  if (awayMs >= BOUNCE_MS) {
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

export async function addToList(userId: string, t: Title) {
  const db = await getDb();
  await db?.query(
    `insert into watchlist (user_id, title_id, kind, title, poster, backdrop, year, imdb_score, genres, language)
     values ($1, $2, $3, $4, $5, $6, $7, $8, ${TEXT_ARRAY(9)}, $10)
     on conflict (user_id, title_id) do nothing`,
    [userId, t.id, t.kind, t.title, t.poster, t.backdrop, t.year, t.imdbScore, JSON.stringify(t.genres), t.language],
  );
}

export async function removeFromList(userId: string, titleId: string) {
  const db = await getDb();
  await db?.query(`delete from watchlist where user_id = $1 and title_id = $2`, [userId, titleId]);
}

export async function hideTitle(userId: string, t: Pick<Title, "id" | "title" | "genres">) {
  const db = await getDb();
  await db?.query(
    `insert into hidden_titles (user_id, title_id, title, genres) values ($1, $2, $3, ${TEXT_ARRAY(4)})
     on conflict (user_id, title_id) do nothing`,
    [userId, t.id, t.title, JSON.stringify(t.genres)],
  );
}

export async function unhideTitle(userId: string, titleId: string) {
  const db = await getDb();
  await db?.query(`delete from hidden_titles where user_id = $1 and title_id = $2`, [userId, titleId]);
}

export async function savePrefs(userId: string, prefs: Partial<Prefs>) {
  const db = await getDb();
  await db?.query(
    `insert into user_prefs (user_id, excluded_languages, discover)
     values ($1, coalesce(${TEXT_ARRAY(2)}, '{}'), coalesce($3, false))
     on conflict (user_id) do update set
       excluded_languages = case when $2::text is null then user_prefs.excluded_languages else excluded.excluded_languages end,
       discover = coalesce($3, user_prefs.discover),
       updated_at = now()`,
    [userId, prefs.excludedLanguages ? JSON.stringify(prefs.excludedLanguages) : null, prefs.discover ?? null],
  );
}

/** Everything personal about a user, in one round trip. */
export async function loadProfile(userId: string): Promise<Profile | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.query<{
    prefs: { excluded_languages: string[]; discover: boolean } | null;
    hidden: { title_id: string; title: string; genres: string[] }[];
    watchlist: Record<string, never>[];
    history: Record<string, never>[];
  }>(
    `select
       (select json_build_object('excluded_languages', excluded_languages, 'discover', discover)
          from user_prefs where user_id = $1) as prefs,
       (select coalesce(json_agg(json_build_object('title_id', title_id, 'title', title, 'genres', genres)
          order by created_at desc), '[]') from hidden_titles where user_id = $1) as hidden,
       (select coalesce(json_agg(w order by w.added_at desc), '[]') from watchlist w where w.user_id = $1) as watchlist,
       (select coalesce(json_agg(e order by e.clicked_at desc), '[]') from (
          select * from watch_entries where user_id = $1 order by clicked_at desc limit 200) e) as history`,
    [userId],
  );
  const json = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;
  const prefs = json<{ excluded_languages: string[]; discover: boolean } | null>(row.prefs);
  type Row = Record<string, string & number & string[]>;

  return {
    prefs: { excludedLanguages: prefs?.excluded_languages ?? [], discover: prefs?.discover ?? false },
    hidden: json<{ title_id: string; title: string; genres: string[] }[]>(row.hidden).map((h) => ({
      titleId: h.title_id,
      title: h.title,
      genres: h.genres ?? [],
    })),
    watchlist: json<Row[]>(row.watchlist).map((w) => ({
      titleId: w.title_id,
      kind: w.kind as Kind,
      title: w.title,
      poster: w.poster ?? null,
      backdrop: w.backdrop ?? null,
      year: w.year ?? null,
      imdbScore: w.imdb_score ?? null,
      genres: w.genres ?? [],
      language: w.language ?? null,
      addedAt: w.added_at,
    })),
    history: json<Row[]>(row.history).map((e) => ({
      titleId: e.title_id,
      kind: e.kind as Kind,
      title: e.title,
      poster: e.poster ?? null,
      backdrop: e.backdrop ?? null,
      provider: e.provider as ProviderId,
      offerId: e.offer_id,
      genres: e.genres ?? [],
      language: e.language ?? null,
      status: e.status as WatchStatus,
      clickedAt: e.clicked_at,
    })),
  };
}
