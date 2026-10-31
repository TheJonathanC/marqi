import { test } from "node:test";
import assert from "node:assert/strict";
import { guessLanguage, languageName } from "./language.ts";

test("script in the original title wins", () => {
  assert.equal(guessLanguage({ originalTitle: "मिर्ज़ापुर", audioLanguages: ["hi", "ta", "te"] }), "hi");
  assert.equal(guessLanguage({ originalTitle: "ദൃശ്യം 3" }), "ml");
  assert.equal(guessLanguage({ originalTitle: "오징어 게임" }), "ko");
  assert.equal(guessLanguage({ originalTitle: "千と千尋の神隠し" }), "ja");
});

test("a single audio track is the original", () => {
  assert.equal(guessLanguage({ originalTitle: "Rise and Fall", productionCountries: ["IN"], audioLanguages: ["hi"] }), "hi");
});

test("English-speaking productions default to English", () => {
  assert.equal(guessLanguage({ originalTitle: "Silo", productionCountries: ["US"], audioLanguages: ["en", "hi"] }), "en");
  assert.equal(guessLanguage({ originalTitle: "Fleabag", productionCountries: ["GB"] }), "en");
});

test("ambiguous titles stay unknown rather than being misfiled", () => {
  assert.equal(guessLanguage({ originalTitle: "Bigg Boss", productionCountries: ["IN"], audioLanguages: [] }), null);
  assert.equal(guessLanguage({ originalTitle: "Drishyam 3", productionCountries: ["IN"], audioLanguages: ["ml", "hi"] }), null);
});

test("language names", () => {
  assert.equal(languageName("hi"), "Hindi");
  assert.equal(languageName("xx"), "XX");
  assert.equal(languageName(null), null);
});
