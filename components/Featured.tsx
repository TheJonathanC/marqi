import { getTitles } from "@/lib/catalog";
import type { Kind, Title } from "@/lib/justwatch";
import { forRow, getProfile, getRecommendations } from "@/lib/personal";
import { Banners, type Feature } from "./Hero";

/** Banners: picks for you first (unless in Discover mode), then trending titles that rate well. */
export async function Featured({ kind }: { kind?: Kind }) {
  const profile = await getProfile();
  const [trending, acclaimed] = await Promise.all([
    getTitles({ kind, sort: "trending", first: 40 }),
    getTitles({ kind, sort: "popular", minImdbScore: 7.5, minImdbVotes: 5_000, first: 40 }),
  ]);
  const recs = profile && !profile.prefs.discover ? (await getRecommendations(profile, kind)).forYou : [];

  const features: Feature[] = [];
  const add = (titles: Title[], eyebrow: (t: Title) => string, max: number) => {
    let added = 0;
    for (const t of forRow(titles, profile, 40)) {
      if (features.length >= 6 || added >= max) return;
      if (!t.backdrop || features.some((f) => f.title.id === t.id)) continue;
      features.push({ title: t, eyebrow: eyebrow(t) });
      added++;
    }
  };
  add(recs, () => "Picked for you", 2);
  add(
    trending.titles.filter((t) => (t.imdbScore ?? 0) >= 7),
    () => "Trending tonight",
    3,
  );
  add(acclaimed.titles, (t) => `Critics' pick · IMDb ${t.imdbScore?.toFixed(1)}`, 6);
  add(trending.titles, () => "Now playing", 6);

  return <Banners features={features} />;
}
