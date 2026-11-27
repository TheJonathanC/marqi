import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Listings change a few times a day, but Marqi has a handful of users, so
    // entries often sit unread for days. Refresh in the background hourly and
    // keep serving the last copy for two weeks, so a quiet spell never means
    // waiting on JustWatch and TMDB.
    catalog: { stale: 300, revalidate: 3600, expire: 14 * 86400 },
    // Rarely changing data (genres, film series, similar titles).
    archive: { stale: 300, revalidate: 86400, expire: 60 * 86400 },
  },
  experimental: {
    // Going back to a page you were just on (title → home → title) is instant.
    // Every action calls refresh(), so changes still show straight away.
    staleTimes: { dynamic: 30 },
  },
  // PGlite (local dev database) ships WASM and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
};

export default nextConfig;
