import { test } from "node:test";
import assert from "node:assert/strict";
import { ageBands, browseHref, certificationsFor, isFiltered, parseFilters, toggle } from "./filters.ts";

const SERVICES = ["nfx", "prv", "jhs", "atp"];

test("parses comma lists and keeps old single-value links working", () => {
  const f = parseFilters({ provider: "prv,nfx", genre: "cmy,rma", age: "18,13", sort: "imdb", imdb: "7" }, SERVICES);
  assert.deepEqual(f.providers, ["nfx", "prv"]); // in service order
  assert.deepEqual(f.genres, ["cmy", "rma"]);
  assert.deepEqual(f.ages, ["13", "18"]);
  assert.deepEqual([f.sort, f.imdb], ["imdb", 7]);
  assert.deepEqual(parseFilters({ genre: "hrr", provider: "jhs" }, SERVICES).genres, ["hrr"]);
});

test("drops invalid values and services outside the region", () => {
  const f = parseFilters({ provider: "jhs,nfx,zzz", genre: "x,toolong,act", age: "21,all", imdb: "9", sort: "bogus", kind: "film" }, ["nfx", "prv", "atp"]);
  assert.deepEqual(f.providers, ["nfx"]);
  assert.deepEqual(f.genres, ["act"]);
  assert.deepEqual(f.ages, ["all"]);
  assert.deepEqual([f.imdb, f.sort, f.kind], [undefined, "popular", undefined]);
});

test("builds readable links, resets paging, and toggles", () => {
  const f = parseFilters({ provider: "nfx", after: "abc" }, SERVICES);
  assert.equal(browseHref(f, { genres: toggle(f.genres, "cmy") }), "/browse?provider=nfx&genre=cmy");
  assert.equal(browseHref(f, { providers: toggle(f.providers, "prv") }), "/browse?provider=nfx,prv");
  assert.equal(browseHref(f, { providers: toggle(f.providers, "nfx") }), "/browse");
  assert.equal(browseHref(f), "/browse?provider=nfx");
  assert.equal(browseHref(f, { after: "next" }), "/browse?provider=nfx&after=next");
});

test("age bands map to each region's certificates", () => {
  assert.deepEqual(certificationsFor(["13", "18"], "IN"), ["UA", "UA13+", "A", "S"]);
  assert.deepEqual(certificationsFor(["all"], "AE"), ["G"]);
  assert.deepEqual(ageBands("IN").map((b) => b.label), ["U", "UA 7+", "UA 13+", "UA 16+", "A"]);
  assert.equal(ageBands("AE")[4].label, "18+");
});

test("sort alone doesn't count as filtering", () => {
  assert.equal(isFiltered(parseFilters({ sort: "az" }, SERVICES)), false);
  assert.equal(isFiltered(parseFilters({ age: "7" }, SERVICES)), true);
});
