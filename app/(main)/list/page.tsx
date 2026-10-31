import type { Metadata } from "next";
import { Suspense } from "react";
import { Grid } from "@/components/Cards";
import { getProfile } from "@/lib/personal";

export const metadata: Metadata = { title: "My List" };

export default function ListPage() {
  return (
    <>
      <div className="page-head">
        <h1>My List</h1>
        <p>Saved for later. Add titles with “+ My List” on any title page.</p>
      </div>
      <Suspense fallback={<div className="empty">Fetching your list…</div>}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  const profile = await getProfile();
  const titles = (profile?.watchlist ?? []).map((w) => ({ ...w, id: w.titleId }));
  if (titles.length === 0) {
    return (
      <div className="empty">
        <strong>Nothing saved yet</strong>
        Open a title and press “+ My List”.
      </div>
    );
  }
  return <Grid titles={titles} />;
}
