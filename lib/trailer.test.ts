import { test } from "node:test";
import assert from "node:assert/strict";
import { pickTrailer, youtubeSearchUrl } from "./trailer.ts";

const v = (key: string, type: string, extra: Partial<{ official: boolean; iso_639_1: string; published_at: string; site: string }> = {}) => ({
  key,
  type,
  site: "YouTube",
  ...extra,
});

test("prefers official trailers over teasers and clips", () => {
  assert.equal(pickTrailer([v("clip", "Clip"), v("teaser", "Teaser", { official: true }), v("trailer", "Trailer")]), "trailer");
  assert.equal(pickTrailer([v("fan", "Trailer"), v("official", "Trailer", { official: true })]), "official");
});

test("prefers the original language, then English, then newest", () => {
  const vids = [
    v("en", "Trailer", { official: true, iso_639_1: "en" }),
    v("ml", "Trailer", { official: true, iso_639_1: "ml" }),
  ];
  assert.equal(pickTrailer(vids, "ml"), "ml");
  assert.equal(pickTrailer(vids, "ko"), "en");
  assert.equal(
    pickTrailer([v("old", "Trailer", { published_at: "2020-01-01" }), v("new", "Trailer", { published_at: "2024-01-01" })]),
    "new",
  );
});

test("ignores non-YouTube and unknown types; empty gives null", () => {
  assert.equal(pickTrailer([v("vimeo", "Trailer", { site: "Vimeo" }), v("bts", "Behind the Scenes")]), null);
  assert.equal(pickTrailer([]), null);
});

test("search fallback", () => {
  assert.equal(youtubeSearchUrl("Silo", 2023), "https://www.youtube.com/results?search_query=Silo%202023%20trailer");
});
