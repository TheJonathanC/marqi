import { test } from "node:test";
import assert from "node:assert/strict";
import { providerList, regionsFor, resolveScope } from "./providers.ts";

test("defaults to every service in India", () => {
  const s = resolveScope(null);
  assert.deepEqual(s.catalog, { country: "IN", providers: ["nfx", "prv", "jhs", "atp"] });
  assert.deepEqual([s.unavailable, s.fallback], [[], false]);
});

test("the UAE has no JioHotstar", () => {
  assert.deepEqual(resolveScope({ region: "AE", providers: [] }).catalog.providers, ["nfx", "prv", "atp"]);
  assert.deepEqual(regionsFor("jhs"), ["IN"]);
});

test("a chosen India-only service is skipped abroad, not forgotten", () => {
  const prefs = { region: "AE", providers: ["jhs", "nfx"] };
  const abroad = resolveScope(prefs);
  assert.deepEqual(abroad.catalog.providers, ["nfx"]);
  assert.deepEqual([abroad.unavailable, abroad.fallback], [["jhs"], false]);
  assert.deepEqual(resolveScope({ ...prefs, region: "IN" }).catalog.providers, ["nfx", "jhs"]);
});

test("only India-only services chosen abroad falls back to everything there", () => {
  const s = resolveScope({ region: "AE", providers: ["jhs"] });
  assert.deepEqual(s.catalog.providers, ["nfx", "prv", "atp"]);
  assert.deepEqual([s.unavailable, s.fallback], [["jhs"], true]);
});

test("ignores unknown regions and services, and keeps a stable order", () => {
  const s = resolveScope({ region: "XX", providers: ["atp", "zzz", "nfx"] });
  assert.deepEqual(s.catalog, { country: "IN", providers: ["nfx", "atp"] });
});

test("lists services in prose", () => {
  assert.equal(providerList(["nfx", "prv", "atp"]), "Netflix, Prime Video and Apple TV");
  assert.equal(providerList(["jhs"]), "JioHotstar");
  assert.equal(providerList(["nfx", "prv"], "or"), "Netflix or Prime Video");
});
