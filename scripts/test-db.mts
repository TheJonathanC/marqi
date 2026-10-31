// Runs lib/watch.ts through the production Postgres driver (postgres.js)
// against an in-memory PGlite exposed over the Postgres wire protocol.
// Catches driver-specific bugs that the embedded dev database hides.
//   npm run test:db
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const server = new PGLiteSocketServer({ db: await PGlite.create(), port: 5444, host: "127.0.0.1" });
await server.start();
process.env.DATABASE_URL = "postgres://postgres@127.0.0.1:5444/postgres";

const w = await import("../lib/watch.ts");
const uid = "gh:1";
const show = {
  id: "ts1", kind: "show", title: "The Boys", poster: null, backdrop: null,
  year: 2019, imdbScore: 8.6, genres: ["act", "scf"], language: "en",
} as never;

try {
  await w.upsertUser({ id: uid, login: "me", name: "Me", avatarUrl: null });
  await w.savePrefs(uid, { excludedLanguages: ["hi", "ta"] });
  await w.savePrefs(uid, { discover: true });
  await w.addToList(uid, show);
  await w.hideTitle(uid, { id: "tm2", title: "Nope", genres: ["rma"] } as never);
  await w.recordClick(uid, {
    titleId: "ts1", kind: "show", title: "The Boys", poster: null, backdrop: null,
    provider: "prv", offerId: "x", genres: ["act"], language: "en",
  });
  await w.recordReturn(uid, "ts1", 5 * 60_000);

  const p = await w.loadProfile(uid);
  assert.deepEqual(p?.prefs, { excludedLanguages: ["hi", "ta"], discover: true });
  assert.deepEqual(p?.watchlist.map((x) => x.genres), [["act", "scf"]]);
  assert.deepEqual(p?.hidden, [{ titleId: "tm2", title: "Nope", genres: ["rma"] }]);
  assert.deepEqual(p?.history.map((h) => [h.status, h.genres]), [["watching", ["act"]]]);
  console.log("✔ watch store works through postgres.js");
} finally {
  await server.stop();
}
process.exit(0);
