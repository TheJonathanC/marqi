import type { Metadata } from "next";
import { Suspense } from "react";
import { Grid } from "@/components/Cards";
import { getTitles } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<div className="empty">Searching the archive…</div>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const raw = (await searchParams).q;
  const q = (typeof raw === "string" ? raw : "").trim().slice(0, 100);

  if (!q) {
    return (
      <div className="empty">
        <strong>What are we watching?</strong>
        Type a title in the search bar, or press <kbd>/</kbd>.
      </div>
    );
  }

  const { titles } = await getTitles({ search: q, first: 30 });
  return (
    <>
      <div className="page-head">
        <h1>“{q}”</h1>
        <p>
          {titles.length} {titles.length === 1 ? "title" : "titles"} on your services
        </p>
      </div>
      {titles.length ? (
        <Grid titles={titles} />
      ) : (
        <div className="empty">
          <strong>Not on the bill</strong>
          Nothing by that name on Prime Video, JioHotstar or Apple TV right now.
        </div>
      )}
    </>
  );
}
