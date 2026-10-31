// Original-language detection. TMDB knows a title's original language
// exactly; JustWatch doesn't expose it, so without a TMDB key we infer it from
// the original title's script and the audio tracks on offer. Pure functions,
// no imports, so they run under `node --test`.

export const LANGUAGES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  ml: "Malayalam",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  bn: "Bengali",
  mr: "Marathi",
  pa: "Punjabi",
  gu: "Gujarati",
  ko: "Korean",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
  th: "Thai",
  ar: "Arabic",
  ru: "Russian",
};

export function languageName(code: string | null | undefined): string | null {
  if (!code) return null;
  return LANGUAGES[code] ?? code.toUpperCase();
}

// Unicode blocks that pin down a language on their own.
const SCRIPTS: [RegExp, string][] = [
  [/[ऀ-ॿ]/, "hi"], // Devanagari (Hindi; Marathi shares it but is rarer here)
  [/[ঀ-৿]/, "bn"],
  [/[਀-੿]/, "pa"],
  [/[઀-૿]/, "gu"],
  [/[஀-௿]/, "ta"],
  [/[ఀ-౿]/, "te"],
  [/[ಀ-೿]/, "kn"],
  [/[ഀ-ൿ]/, "ml"],
  [/[가-힯ᄀ-ᇿ]/, "ko"],
  [/[぀-ヿ]/, "ja"],
  [/[一-鿿]/, "zh"],
  [/[฀-๿]/, "th"],
  [/[؀-ۿ]/, "ar"],
  [/[Ѐ-ӿ]/, "ru"],
];

const ENGLISH_COUNTRIES = new Set(["US", "GB", "CA", "AU", "IE", "NZ"]);

export type LanguageHints = {
  originalTitle?: string | null;
  productionCountries?: string[] | null;
  /** Union of audio tracks across the title's offers */
  audioLanguages?: string[] | null;
};

/** Best guess at the original language, or null when the signals disagree. */
export function guessLanguage({ originalTitle, productionCountries, audioLanguages }: LanguageHints): string | null {
  if (originalTitle) {
    for (const [pattern, code] of SCRIPTS) if (pattern.test(originalTitle)) return code;
  }
  const countries = productionCountries ?? [];
  const audio = [...new Set(audioLanguages ?? [])];

  // A single audio track is the original almost every time.
  if (audio.length === 1) return audio[0];

  if (countries.length > 0 && countries.every((c) => ENGLISH_COUNTRIES.has(c))) {
    if (audio.length === 0 || audio.includes("en")) return "en";
  }
  return null;
}
