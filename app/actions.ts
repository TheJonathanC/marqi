"use server";

import { refresh } from "next/cache";
import { isTitleId } from "@/lib/justwatch";
import { getSessionUser } from "@/lib/session";
import { recordReturn, setStatus } from "@/lib/watch";

// Every action re-reads the session instead of trusting anything from the client.

export async function reportReturn(titleId: string, awayMs: number) {
  const user = await getSessionUser();
  if (!user || !isTitleId(titleId) || !Number.isFinite(awayMs) || awayMs < 0) return;
  await recordReturn(user.id, titleId, awayMs);
  refresh();
}

async function updateEntry(formData: FormData, status: "finished" | "dismissed") {
  const user = await getSessionUser();
  const titleId = String(formData.get("titleId") ?? "");
  if (!user || !isTitleId(titleId)) return;
  await setStatus(user.id, titleId, status);
  refresh();
}

export async function finishEntry(formData: FormData) {
  await updateEntry(formData, "finished");
}

export async function dismissEntry(formData: FormData) {
  await updateEntry(formData, "dismissed");
}
