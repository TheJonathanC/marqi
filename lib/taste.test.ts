import { test } from "node:test";
import assert from "node:assert/strict";
import { genreAffinity, interacted, pickSeeds, rankCandidates, unexploredGenres, visible } from "./taste.ts";

const profile = {
  prefs: { excludedLanguages: ["hi"] },
  hidden: [{ titleId: "tm9", genres: ["rma"] }],
  watchlist: [{ titleId: "ts2", title: "Silo", genres: ["scf", "drm"], addedAt: "2026-10-30T00:00:00Z" }],
  history: [
    { titleId: "ts1", title: "The Boys", genres: ["act", "scf"], status: "finished", clickedAt: "2026-10-29T00:00:00Z" },
    { titleId: "tm3", title: "Peeked", genres: ["hrr"], status: "bounced", clickedAt: "2026-10-31T00:00:00Z" },
    { titleId: "tm4", title: "Nope", genres: ["cmy"], status: "dismissed", clickedAt: "2026-10-28T00:00:00Z" },
  ],
};

const t = (id: string, genres: string[], language: string | null = "en", imdbScore: number | null = 7) => ({
  id,
  genres,
  language,
  imdbScore,
});

test("visible drops excluded languages and hidden titles, keeps unknown language", () => {
  const out = visible([t("a", []), t("b", [], "hi"), t("tm9", []), t("c", [], null)], profile);
  assert.deepEqual(out.map((x) => x.id), ["a", "c"]);
});

test("affinity favours finished and listed genres, penalises hidden and dismissed", () => {
  const a = genreAffinity(profile);
  assert.equal(a.get("scf"), 1);
  assert.ok((a.get("act") ?? 0) > 0);
  assert.ok((a.get("rma") ?? 0) < 0);
  assert.ok((a.get("cmy") ?? 0) < 0);
});

test("seeds are positive signals ordered by strength", () => {
  assert.deepEqual(pickSeeds(profile).map((s) => s.title), ["The Boys", "Silo"]);
});

test("candidates suggested by several seeds rank first; seen titles never appear", () => {
  const [boys, silo] = pickSeeds(profile);
  const ranked = rankCandidates(
    [
      { seed: boys, titles: [t("x", ["cmy"]), t("both", ["scf"]), t("ts2", ["scf"])] },
      { seed: silo, titles: [t("both", ["scf"]), t("y", ["drm"])] },
    ],
    genreAffinity(profile),
    interacted(profile),
  );
  assert.equal(ranked[0].id, "both");
  assert.ok(!ranked.some((r) => r.id === "ts2"));
});

test("unexplored genres skip what you already like and rotate", () => {
  const a = genreAffinity(profile);
  const all = ["act", "scf", "drm", "doc", "hst", "msc"];
  assert.deepEqual(unexploredGenres(a, all, 2, 0), ["doc", "hst"]);
  assert.deepEqual(unexploredGenres(a, all, 2, 1), ["hst", "msc"]);
});
