"use server";

import { refresh } from "next/cache";
import { getTitle } from "@/lib/catalog";
import { isTitleId } from "@/lib/justwatch";
import { LANGUAGES } from "@/lib/language";
import { getSessionUser } from "@/lib/session";
import {
  addToList,
  hideTitle,
  recordReturn,
  removeFromList,
  savePrefs,
  setStatus,
  unhideTitle,
} from "@/lib/watch";

// Every action re-reads the session instead of trusting anything from the
// client, and title details come from the catalog, not the form.

export async function reportReturn(titleId: string, awayMs: number) {
  const user = await getSessionUser();
  if (!user || !isTitleId(titleId) || !Number.isFinite(awayMs) || awayMs < 0) return;
  await recordReturn(user.id, titleId, awayMs);
  refresh();
}

async function withTitle(formData: FormData, fn: (userId: string, titleId: string) => Promise<void>) {
  const user = await getSessionUser();
  const titleId = String(formData.get("titleId") ?? "");
  if (!user || !isTitleId(titleId)) return;
  await fn(user.id, titleId);
  refresh();
}

export async function finishEntry(formData: FormData) {
  await withTitle(formData, (userId, titleId) => setStatus(userId, titleId, "finished"));
}

export async function dismissEntry(formData: FormData) {
  await withTitle(formData, (userId, titleId) => setStatus(userId, titleId, "dismissed"));
}

export async function addToListAction(formData: FormData) {
  await withTitle(formData, async (userId, titleId) => {
    const title = await getTitle(titleId);
    if (title) await addToList(userId, title);
  });
}

export async function removeFromListAction(formData: FormData) {
  await withTitle(formData, removeFromList);
}

export async function hideTitleAction(formData: FormData) {
  await withTitle(formData, async (userId, titleId) => {
    const title = await getTitle(titleId);
    if (title) await hideTitle(userId, title);
  });
}

export async function unhideTitleAction(formData: FormData) {
  await withTitle(formData, unhideTitle);
}

export async function saveLanguagesAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const excluded = formData
    .getAll("exclude")
    .map(String)
    .filter((code) => code in LANGUAGES);
  await savePrefs(user.id, { excludedLanguages: [...new Set(excluded)] });
  refresh();
}

export async function setDiscoverAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  await savePrefs(user.id, { discover: formData.get("discover") === "on" });
  refresh();
}
