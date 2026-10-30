# Marqi

A personal streaming launcher for India. Browse, filter, and launch movies and TV shows on **Prime Video**, **JioHotstar**, and **Apple TV** without opening the heavy official apps.

Marqi is the first layer: you pick a title here, and Marqi sends you to the right page on the provider's site through a redirect that cleans the link and checks that it lands on the Indian storefront.

- **India only.** Every query is locked to `IN`.
- **Subscriptions only.** `flatrate` offers from exactly three packages. Rentals, purchases and Prime add-on channels (Lionsgate Play, MGM+, …) are removed.
- **Storefront guard.** `amazon.com` and other non-India links are rejected, and Apple TV links are rewritten to `/in/`. Tracking params are stripped, while Prime's `gti` is kept.
- **Continue Watching.** Tracks what you actually watch with a dwell-time heuristic, with no provider API access needed.
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

1. The click is logged on the server as `pending`.
2. While you're on the provider's tab, the Marqi tab is hidden. When you come back, the Page Visibility API reports how long you were away.
3. If you were away 10 minutes or more, the title becomes `watching` and appears in the row. Shorter visits are marked `bounced`.
4. If you never come back (you closed the tab), a pending click older than 10 minutes counts as watching anyway.
5. Each card has ✓ (finished) and ✕ (remove).

Providers don't expose episode progress, so for shows the row resumes the show, not a specific episode.

## Development

```bash
npm install
npm run dev
```

Nothing else is required locally:
- Without `GITHUB_CLIENT_ID`, `/auth/login` signs you in as a local dev user.
- Without `DATABASE_URL`, an embedded [PGlite](https://pglite.dev) Postgres runs the same SQL from `.data/`.
- Without `TMDB_API_KEY`, everything runs off JustWatch data.

```bash
npm test          # link cleaner / storefront guard tests
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
| `TMDB_API_KEY` | no | v3 key or v4 read token. Adds taglines and 4K backdrops. |

## Project layout

```
app/
  (main)/page.tsx          Home: featured hero + rows (Continue Watching streams in)
  (main)/browse/page.tsx   Filter grid; filters live in the URL
  (main)/search/page.tsx   Search
  (main)/title/[id]/       Title detail with one ticket per service
  go/[offerId]/route.ts    Smart redirect
  auth/*                   GitHub OAuth (login, callback, logout)
  login/page.tsx           Sign-in page
  actions.ts               Server actions for Continue Watching
components/                Server components + one tiny client script (LauncherScripts)
lib/
  providers.ts             The three services and their JustWatch package IDs
  justwatch.ts             All JustWatch GraphQL (unofficial API, kept in one place)
  links.ts                 URL cleaning + storefront guard (unit-tested)
  catalog.ts               Cached data access
  watch.ts                 Continue Watching state machine
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
