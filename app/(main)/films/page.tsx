import type { Metadata } from "next";
import { KindPage } from "@/components/KindPage";

export const metadata: Metadata = { title: "Films" };

export default function FilmsPage() {
  return <KindPage kind="movie" />;
}
