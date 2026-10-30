import "server-only";

// Postgres in production (Neon via the Vercel Marketplace, or any Postgres
// URL). In development without DATABASE_URL, an embedded PGlite database in
// .data/ runs the exact same SQL, so nothing needs installing locally.

export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

const SCHEMA = [
  `create table if not exists users (
    id text primary key,
    login text not null,
    name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    last_login_at timestamptz not null default now()
  )`,
  `create table if not exists watch_entries (
    user_id text not null references users(id) on delete cascade,
    title_id text not null,
    kind text not null,
    title text not null,
    poster text,
    backdrop text,
    provider text not null,
    offer_id text not null,
    status text not null check (status in ('pending', 'bounced', 'watching', 'finished', 'dismissed')),
    clicked_at timestamptz not null default now(),
    watched_at timestamptz,
    primary key (user_id, title_id)
  )`,
  `create index if not exists watch_entries_recent on watch_entries (user_id, clicked_at desc)`,
];

// Route handlers and server actions are bundled separately, so a module-level
// variable would give each its own connection (and in dev, two PGlite
// instances fighting over one directory). One per process, on globalThis.
const holder = globalThis as typeof globalThis & { __marqiDb?: Promise<Db | null> };

export function getDb(): Promise<Db | null> {
  holder.__marqiDb ??= connect().catch((err) => {
    holder.__marqiDb = undefined;
    throw err;
  });
  return holder.__marqiDb;
}

async function connect(): Promise<Db | null> {
  const url = process.env.DATABASE_URL;
  let db: Db;

  if (url) {
    const { default: postgres } = await import("postgres");
    // prepare: false keeps this compatible with pooled (PgBouncer) URLs.
    const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20 });
    db = { query: (text, params = []) => sql.unsafe(text, params as never[]) as never };
  } else if (process.env.NODE_ENV !== "production") {
    const { PGlite } = await import("@electric-sql/pglite");
    const { mkdir } = await import("node:fs/promises");
    const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
    await mkdir(dir, { recursive: true });
    const pg = new PGlite(dir);
    db = { query: async (text, params = []) => (await pg.query(text, params)).rows as never };
  } else {
    console.warn("[marqi] DATABASE_URL is not set; Continue Watching is disabled.");
    return null;
  }

  for (const statement of SCHEMA) await db.query(statement);
  return db;
}
