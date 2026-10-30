import { test } from "node:test";
import assert from "node:assert/strict";
import { providerSearchUrl, safeProviderUrl } from "./links.ts";

test("keeps Prime gti and strips tracking", () => {
  const out = safeProviderUrl(
    "prv",
    "https://app.primevideo.com/detail?gti=amzn1.dv.gti.abc&utm_source=jw&tag=aff-21&ref_=x",
  );
  assert.equal(out, "https://app.primevideo.com/detail?gti=amzn1.dv.gti.abc");
});

test("rejects non-India Amazon storefronts", () => {
  assert.equal(safeProviderUrl("prv", "https://www.amazon.com/gp/video/detail/B0X"), null);
  assert.equal(safeProviderUrl("prv", "https://www.amazon.co.uk/gp/video/detail/B0X"), null);
  assert.ok(safeProviderUrl("prv", "https://www.amazon.in/gp/video/detail/B0X"));
});

test("rejects http and unrelated hosts", () => {
  assert.equal(safeProviderUrl("prv", "http://app.primevideo.com/detail?gti=x"), null);
  assert.equal(safeProviderUrl("jhs", "https://evil.example/in/movies/x"), null);
  assert.equal(safeProviderUrl("atp", "not a url"), null);
});

test("Hotstar must be the /in/ storefront", () => {
  assert.equal(
    safeProviderUrl("jhs", "https://www.hotstar.com/in/movies/x/123?search_query=X&utm_medium=y"),
    "https://www.hotstar.com/in/movies/x/123",
  );
  assert.equal(safeProviderUrl("jhs", "https://www.hotstar.com/us/movies/x/123"), null);
});

test("Apple TV is rewritten to /in/ and keeps playable params", () => {
  const out = safeProviderUrl(
    "atp",
    "https://tv.apple.com/us/episode/pilot/umc.cmc.1?at=1000l3V2&ct=app_tvplus&itscg=30200&itsct=justwatch_tv&playableId=tvs.sbd.4000%3AA1&showId=umc.cmc.2",
  );
  assert.equal(
    out,
    "https://tv.apple.com/in/episode/pilot/umc.cmc.1?playableId=tvs.sbd.4000%3AA1&showId=umc.cmc.2",
  );
  assert.equal(
    safeProviderUrl("atp", "https://tv.apple.com/movie/x/umc.cmc.9"),
    "https://tv.apple.com/in/movie/x/umc.cmc.9",
  );
});

test("search fallbacks are encoded", () => {
  assert.equal(
    providerSearchUrl("atp", "Ted Lasso & Co"),
    "https://tv.apple.com/in/search?term=Ted%20Lasso%20%26%20Co",
  );
});
