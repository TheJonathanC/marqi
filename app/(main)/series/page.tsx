import type { Metadata } from "next";
import { KindPage } from "@/components/KindPage";

export const metadata: Metadata = { title: "Series" };

export default function SeriesPage() {
  return <KindPage kind="show" />;
}
