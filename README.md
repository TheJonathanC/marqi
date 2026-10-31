# Marqi

A personal streaming launcher for India. Browse, filter, and launch movies and TV shows on **Prime Video**, **JioHotstar**, and **Apple TV** without opening the heavy official apps.

Marqi is the first layer: you pick a title here, and Marqi sends you to the right page on the provider's site through a redirect that cleans the link and checks that it lands on the Indian storefront.

- **India only.** Every query is locked to `IN`.
- **Subscriptions only.** `flatrate` offers from exactly three packages. Rentals, purchases and Prime add-on channels (Lionsgate Play, MGM+, …) are removed.
- **Storefront guard.** `amazon.com` and other non-India links are rejected, and Apple TV links are rewritten to `/in/`. Tracking params are stripped, while Prime's `gti` is kept.
- **Continue Watching.** Tracks what you open and resume, with no provider API access needed. "I'm watching" and "Already watched" on any title page set it by hand.
- **IMDb everywhere.** Ratings on every poster, vote counts and IMDb links on title pages, and an IMDb minimum filter in Browse.
- **Films and Series pages.** Trays for each: For You, Because you watched, Popular, Trending, New Releases, IMDb Top Rated, genre trays ordered by your taste, and one per service.
- **One-click watched.** Hover any poster and press ✓ to mark it watched, or run through `/seen` to tick off what you've already seen.
- **Seasons and episodes.** Show pages list every season with each episode's title, synopsis, runtime and air date, plus stills and ratings from TMDB.
- **Trailers.** Played in an overlay inside Marqi. YouTube only loads when you press play.
- **My List.** Save titles for later.
- **Language filter.** Pick the original languages you watch (say, English and Malayalam) and only those show up, in every row, banner, browse page, search and recommendation.
- **For You.** Recommendations from what you watch and save, plus "Because you watched…" and "More like this".
- **Discover mode.** Switch off recommendations and already-seen titles to surface well-rated titles in genres you don't usually watch. "Not interested" hides any title for good.
- **Fast on weak hardware.** Server-rendered, aggressively cached, about 2 KB of Marqi's own client JS, plain `<img>` straight from the image CDNs.

## How it works

```
Browser ──► Next.js (Vercel, bom1)
              │
              ├─ lib/justwatch.ts   JustWatch GraphQL: titles, offers, deep links, credits
              ├─ lib/tmdb.ts        TMDB (optional): taglines, original-resolution backdrops
              ├─ lib/catalog.ts     "use cache" wrappers. Catalog cached for hours.
              │
              ├─ /go/[offerId]      Smart redirect: re-resolve offer → clean → India check → log click → 302
              └─ Postgres           users + watch_entries (Continue Watching)
```

**Smart redirect.** Watch buttons point at `/go/<offerId>`, never at a raw URL, so Marqi can't be used as an open redirect. The route decodes the JustWatch offer ID, re-fetches the title's current offers (cached for minutes), cleans the URL with `lib/links.ts`, and falls back to the provider's search page if the link is missing or points at the wrong storefront.

**Continue Watching.** Watch links open in a new tab.

1. The click is logged on the server, and the title appears in Continue Watching straight away.
2. While you're on the provider's tab, the Marqi tab is hidden. When you come back, the Page Visibility API reports how long you were away.
3. Back within 2 minutes means you only peeked, so the title drops out again. Longer means you're watching it.
4. Each card has ✓ (finished) and ✕ (remove).

Providers don't expose episode progress, so for shows the row resumes the show, not a specific episode.

**Recommendations** (`lib/taste.ts`). Every interaction is a weighted signal: finished or marked watched 4, watching 3, opened 2, in My List 2.5, peeked 0.5, removed −1, not interested −2. The signals build a genre-affinity profile and pick up to five "seed" titles. Candidates come from JustWatch's similar titles for each seed, and are scored by how many seeds point at them (and how high up), how well their genres fit, and their IMDb rating. Anything you've already touched is never recommended.

**Discover mode** replaces For You with top-rated titles from genres you rarely watch (the pick rotates daily), and filters already-seen titles out of every row.

**Languages.** JustWatch has no original-language field. With `TMDB_API_KEY` set, Marqi uses TMDB's exact original language. Without it, it infers the language from the original title's script and the offers' audio tracks (`lib/language.ts`), and leaves titles it can't place visible.

## Development

```bash
npm install
npm run dev
```

Nothing else is required locally:
- Without `GITHUB_CLIENT_ID`, `/auth/login` signs you in as a local dev user.
- Without `DATABASE_URL`, an embedded [PGlite](https://pglite.dev) Postgres runs the same SQL from `.data/`.
- Without `TMDB_API_KEY`, everything runs off JustWatch data and the language heuristic.

```bash
npm test          # link cleaner, language detection, recommendation tests
npm run test:db   # database queries through the production Postgres driver
npm run lint
npm run typecheck
```

## Deploying to Vercel

1. Import the repo into Vercel. `vercel.json` pins functions to `bom1` (Mumbai).
2. Add a Postgres database: **Storage → Neon** in the Vercel Marketplace sets `DATABASE_URL`. Tables are created automatically on first use.
3. Create a GitHub OAuth app at <https://github.com/settings/developers> with callback URL `https://<your-domain>/auth/callback`.
4. Set the environment variables from `.env.example`:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Set by the Neon integration |
| `SESSION_SECRET` | yes | 32+ random characters, e.g. `openssl rand -base64 32` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | yes | From the OAuth app |
| `ALLOWED_GITHUB_LOGINS` | yes | Comma-separated logins allowed in. Empty means nobody. |
| `TMDB_API_KEY` | recommended | v3 key or v4 read token (free from themoviedb.org). Makes the language filter exact, and adds trailers, episode stills and ratings, taglines, fuller synopses and 4K backdrops. |

## Project layout

```
app/
  (main)/page.tsx          Home: featured hero + rows (Continue Watching streams in)
  (main)/browse/page.tsx   Filter grid; filters live in the URL
  (main)/search/page.tsx   Search
  (main)/title/[id]/       Title detail: tickets, My List, Not interested, More like this
  (main)/films, series/    Tray pages for each kind (components/KindPage.tsx)
  (main)/seen/             Quick "mark what you've seen" grid
  (main)/list/             My List
  (main)/settings/         Language filter, Discover mode, hidden titles
  go/[offerId]/route.ts    Smart redirect
  auth/*                   GitHub OAuth (login, callback, logout)
  login/page.tsx           Sign-in page
  actions.ts               Server actions for Continue Watching
components/                Server components + one tiny client script (LauncherScripts)
lib/
  providers.ts             The three services and their JustWatch package IDs
  justwatch.ts             All JustWatch GraphQL (unofficial API, kept in one place)
  links.ts                 URL cleaning + storefront guard (unit-tested)
  catalog.ts               Shared, remotely cached catalog access
  personal.ts              Per-request profile, filtering, recommendations
  taste.ts                 Recommendation scoring (unit-tested)
  language.ts              Original-language detection (unit-tested)
  watch.ts                 Continue Watching, My List, hidden titles, prefs (SQL)
  db.ts / session.ts       Postgres/PGlite and encrypted cookie sessions
proxy.ts                   Sends signed-out visitors to /login
```

## Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `←` `→` | Move along a row |
| `↑` `↓` | Move between rows |
| `Enter` | Open |
| `Esc` | Leave the search box |

---

Listings courtesy of [JustWatch](https://www.justwatch.com/in). This product uses the TMDB API but is not endorsed or certified by TMDB. JustWatch's GraphQL API is unofficial and may change without notice.
