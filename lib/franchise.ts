// Film series: which films belong together, the order they came out, and the
// order to watch them in. Pure data and functions, no imports, so they run
// under `node --test`; lib/catalog.ts feeds them TMDB and JustWatch data.
//
// Most series come straight from TMDB collections, where release order is
// also the story order. The sagas below are written by hand because their
// story order differs (prequels, spin-offs, a Tokyo Drift that happens after
// Fast & Furious 6) or because TMDB splits them across collections (The
// Hobbit and The Lord of the Rings). Films are TMDB movie IDs, checked against
// JustWatch's external IDs; titles are only used to find them on JustWatch.

export type SagaFilm = readonly [tmdbId: string, title: string];

export type Saga = {
  id: string;
  name: string;
  /** Story (watch) order */
  films: readonly SagaFilm[];
  /** Why the watch order looks the way it does */
  note: string;
};

export const SAGAS: readonly Saga[] = [
  {
    id: "star-wars",
    name: "Star Wars",
    films: [
      ["1893", "Star Wars: Episode I - The Phantom Menace"],
      ["1894", "Star Wars: Episode II - Attack of the Clones"],
      ["12180", "Star Wars: The Clone Wars"],
      ["1895", "Star Wars: Episode III - Revenge of the Sith"],
      ["348350", "Solo: A Star Wars Story"],
      ["330459", "Rogue One: A Star Wars Story"],
      ["11", "Star Wars"],
      ["1891", "The Empire Strikes Back"],
      ["1892", "Return of the Jedi"],
      ["1228710", "The Mandalorian and Grogu"],
      ["140607", "Star Wars: The Force Awakens"],
      ["181808", "Star Wars: The Last Jedi"],
      ["181812", "Star Wars: The Rise of Skywalker"],
    ],
    note: "The prequels first, Solo and Rogue One leading into A New Hope, and The Mandalorian and Grogu between Return of the Jedi and The Force Awakens.",
  },
  {
    id: "middle-earth",
    name: "Middle-earth",
    films: [
      ["839033", "The Lord of the Rings: The War of the Rohirrim"],
      ["49051", "The Hobbit: An Unexpected Journey"],
      ["57158", "The Hobbit: The Desolation of Smaug"],
      ["122917", "The Hobbit: The Battle of the Five Armies"],
      ["1090869", "The Lord of the Rings: The Hunt for Gollum"],
      ["120", "The Lord of the Rings: The Fellowship of the Ring"],
      ["121", "The Lord of the Rings: The Two Towers"],
      ["122", "The Lord of the Rings: The Return of the King"],
    ],
    note: "The War of the Rohirrim is set about 180 years before The Hobbit, and The Hobbit trilogy leads into The Lord of the Rings.",
  },
  {
    id: "hunger-games",
    name: "The Hunger Games",
    films: [
      ["695721", "The Hunger Games: The Ballad of Songbirds & Snakes"],
      ["1300968", "The Hunger Games: Sunrise on the Reaping"],
      ["70160", "The Hunger Games"],
      ["101299", "The Hunger Games: Catching Fire"],
      ["131631", "The Hunger Games: Mockingjay - Part 1"],
      ["131634", "The Hunger Games: Mockingjay - Part 2"],
    ],
    note: "The Ballad of Songbirds & Snakes (the 10th Games) and Sunrise on the Reaping (the 50th) are prequels to Katniss's 74th Games.",
  },
  {
    id: "wizarding-world",
    name: "Wizarding World",
    films: [
      ["259316", "Fantastic Beasts and Where to Find Them"],
      ["338952", "Fantastic Beasts: The Crimes of Grindelwald"],
      ["338953", "Fantastic Beasts: The Secrets of Dumbledore"],
      ["671", "Harry Potter and the Philosopher's Stone"],
      ["672", "Harry Potter and the Chamber of Secrets"],
      ["673", "Harry Potter and the Prisoner of Azkaban"],
      ["674", "Harry Potter and the Goblet of Fire"],
      ["675", "Harry Potter and the Order of the Phoenix"],
      ["767", "Harry Potter and the Half-Blood Prince"],
      ["12444", "Harry Potter and the Deathly Hallows: Part 1"],
      ["12445", "Harry Potter and the Deathly Hallows: Part 2"],
    ],
    note: "Fantastic Beasts is set in the 1920s and 30s, about 70 years before Harry arrives at Hogwarts.",
  },
  {
    id: "alien",
    name: "Alien",
    films: [
      ["70981", "Prometheus"],
      ["126889", "Alien: Covenant"],
      ["348", "Alien"],
      ["945961", "Alien: Romulus"],
      ["679", "Aliens"],
      ["8077", "Alien³"],
      ["8078", "Alien Resurrection"],
    ],
    note: "Prometheus and Covenant are prequels, and Romulus is set between Alien and Aliens.",
  },
  {
    id: "fast-and-furious",
    name: "Fast & Furious",
    films: [
      ["9799", "The Fast and the Furious"],
      ["584", "2 Fast 2 Furious"],
      ["13804", "Fast & Furious"],
      ["51497", "Fast Five"],
      ["82992", "Fast & Furious 6"],
      ["9615", "The Fast and the Furious: Tokyo Drift"],
      ["168259", "Furious 7"],
      ["337339", "The Fate of the Furious"],
      ["384018", "Fast & Furious Presents: Hobbs & Shaw"],
      ["385128", "F9"],
      ["385687", "Fast X"],
    ],
    note: "Tokyo Drift came out third but happens after Fast & Furious 6, which is why Han is back in between.",
  },
  {
    id: "despicable-me",
    name: "Despicable Me",
    films: [
      ["211672", "Minions"],
      ["438148", "Minions: The Rise of Gru"],
      ["20352", "Despicable Me"],
      ["93456", "Despicable Me 2"],
      ["324852", "Despicable Me 3"],
      ["519182", "Despicable Me 4"],
    ],
    note: "The two Minions films are prequels: they show how the Minions found a young Gru.",
  },
];

/** The hand-written saga a film belongs to, if any. */
export function sagaFor(tmdbId: string): Saga | null {
  return SAGAS.find((s) => s.films.some(([id]) => id === tmdbId)) ?? null;
}

export type FranchiseFilm = {
  tmdbId: string;
  title: string;
  /** YYYY-MM-DD when known (TMDB), else null */
  date: string | null;
  year: number | null;
};

export type Orders<T> = {
  release: T[];
  watch: T[];
  /** False when the two orders are the same, so there's no point offering both */
  differ: boolean;
};

function releaseKey(f: FranchiseFilm): string {
  // Unknown dates are unannounced films: last.
  return f.date ?? (f.year ? `${f.year}-99-99` : "9999-99-99");
}

/**
 * Release order from dates (years when that's all there is; ties keep the
 * given order), and watch order as given: story order for a saga, release
 * order for a plain collection.
 */
export function orderFilms<T extends FranchiseFilm>(films: T[], storyOrder: boolean): Orders<T> {
  const release = films
    .map((f, i) => ({ f, i }))
    .sort((a, b) => releaseKey(a.f).localeCompare(releaseKey(b.f)) || a.i - b.i)
    .map(({ f }) => f);
  const watch = storyOrder ? films : release;
  return { release, watch, differ: watch.some((f, i) => f !== release[i]) };
}

/** "Collection" is noise in a heading: "The Hunger Games Collection" → "The Hunger Games". */
export function franchiseName(name: string): string {
  return name.replace(/\s+(Collection|Saga|Trilogy|Series)$/i, "").trim() || name;
}

/** 1 → "1st", 2 → "2nd", 11 → "11th" */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}
