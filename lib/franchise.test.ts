import { test } from "node:test";
import assert from "node:assert/strict";
import { SAGAS, franchiseName, orderFilms, ordinal, sagaFor } from "./franchise.ts";

const film = (tmdbId: string, year: number | null, date: string | null = null) => ({
  tmdbId,
  title: tmdbId,
  year,
  date,
});

test("finds the saga for any of its films", () => {
  assert.equal(sagaFor("330459")?.id, "star-wars"); // Rogue One, not in TMDB's Star Wars collection
  assert.equal(sagaFor("49051")?.id, "middle-earth"); // The Hobbit, a separate TMDB collection
  assert.equal(sagaFor("1"), null);
});

test("no film is in two sagas, and no saga lists a film twice", () => {
  const ids = SAGAS.flatMap((s) => s.films.map(([id]) => id));
  assert.equal(new Set(ids).size, ids.length);
});

test("Hunger Games: prequels first to watch, last by release", () => {
  const saga = sagaFor("70160")!;
  const years: Record<string, number> = { "695721": 2023, "1300968": 2026, "70160": 2012, "101299": 2013, "131631": 2014, "131634": 2015 };
  const films = saga.films.map(([id]) => film(id, years[id]));
  const { release, watch, differ } = orderFilms(films, true);
  assert.deepEqual(watch.map((f) => f.tmdbId).slice(0, 3), ["695721", "1300968", "70160"]);
  assert.deepEqual(release.map((f) => f.tmdbId), ["70160", "101299", "131631", "131634", "695721", "1300968"]);
  assert.equal(differ, true);
});

test("full dates beat years, ties keep the given order, unknown dates go last", () => {
  const films = [film("b", 2015, "2015-11-20"), film("unannounced", null), film("a", 2015, "2015-03-01"), film("c", 2015), film("d", 2015)];
  assert.deepEqual(
    orderFilms(films, false).release.map((f) => f.tmdbId),
    ["a", "b", "c", "d", "unannounced"],
  );
});

test("a plain collection watches in release order, so the orders don't differ", () => {
  const { watch, release, differ } = orderFilms([film("2", 2010), film("1", 2005)], false);
  assert.deepEqual(watch, release);
  assert.equal(differ, false);
});

test("tidies collection names and counts", () => {
  assert.equal(franchiseName("The Hunger Games Collection"), "The Hunger Games");
  assert.equal(franchiseName("Collection"), "Collection");
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
});
