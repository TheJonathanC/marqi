// Images are served straight from the JustWatch and TMDB CDNs, which already
// resize. No Next image optimiser in between: nothing to pay for, no extra hop.

const JW = "https://images.justwatch.com";
const TMDB = "https://image.tmdb.org/t/p";

const POSTER_PROFILES = [166, 332, 592] as const;
const BACKDROP_PROFILES = [640, 1440, 1920] as const;

function jw(template: string, profile: number) {
  return JW + template.replace("{profile}", `s${profile}`).replace("{format}", "webp");
}

export type ImageSet = { src: string; srcSet: string };

export function posterSet(template: string): ImageSet {
  return {
    src: jw(template, 332),
    srcSet: POSTER_PROFILES.map((p) => `${jw(template, p)} ${p}w`).join(", "),
  };
}

export function backdropSet(template: string): ImageSet {
  return {
    src: jw(template, 1440),
    srcSet: BACKDROP_PROFILES.map((p) => `${jw(template, p)} ${p}w`).join(", "),
  };
}

/** TMDB backdrops, with the original (often 4K) only picked on large, dense screens. */
export function tmdbBackdropSet(path: string): ImageSet {
  return {
    src: `${TMDB}/w1280${path}`,
    srcSet: `${TMDB}/w780${path} 780w, ${TMDB}/w1280${path} 1280w, ${TMDB}/original${path} 3840w`,
  };
}
