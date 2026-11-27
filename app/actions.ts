"use server";

import { refresh } from "next/cache";
import { getTitle } from "@/lib/catalog";
import { isTitleId } from "@/lib/justwatch";
import { LANGUAGES } from "@/lib/language";
import { PROVIDER_IDS, isProviderId, isRegionId, resolveScope } from "@/lib/providers";
import { getSessionUser } from "@/lib/session";
import {
  addToList,
  clearStatus,
  hideTitle,
  loadPrefs,
  markStatus,
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

/** A title as the user sees it: in their region, with offers from their services. */
async function titleFor(userId: string, titleId: string) {
  const { catalog } = resolveScope(await loadPrefs(userId));
  return getTitle(titleId, catalog);
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

export async function markWatchingAction(formData: FormData) {
  await withTitle(formData, async (userId, titleId) => {
    const title = await titleFor(userId, titleId);
    if (title) await markStatus(userId, title, "watching");
  });
}

export async function markWatchedAction(formData: FormData) {
  await withTitle(formData, async (userId, titleId) => {
    const title = await titleFor(userId, titleId);
    if (title) await markStatus(userId, title, "finished");
  });
}

/** The ✓ on poster cards: mark as watched, or undo, without opening the title. */
export async function setWatchedAction(titleId: string, watched: boolean) {
  const user = await getSessionUser();
  if (!user || !isTitleId(titleId)) return;
  if (watched) {
    const title = await titleFor(user.id, titleId);
    if (title) await markStatus(user.id, title, "finished");
  } else {
    await clearStatus(user.id, titleId);
  }
  refresh();
}

export async function clearWatchAction(formData: FormData) {
  await withTitle(formData, clearStatus);
}

export async function addToListAction(formData: FormData) {
  await withTitle(formData, async (userId, titleId) => {
    const title = await titleFor(userId, titleId);
    if (title) await addToList(userId, title);
  });
}

export async function removeFromListAction(formData: FormData) {
  await withTitle(formData, removeFromList);
}

export async function hideTitleAction(formData: FormData) {
  await withTitle(formData, async (userId, titleId) => {
    const title = await titleFor(userId, titleId);
    if (title) await hideTitle(userId, title);
  });
}

export async function unhideTitleAction(formData: FormData) {
  await withTitle(formData, unhideTitle);
}

export async function saveLanguagesAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const languages = formData
    .getAll("language")
    .map(String)
    .filter((code) => code in LANGUAGES);
  await savePrefs(user.id, { languages: [...new Set(languages)] });
  refresh();
}

export async function saveProvidersAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  const chosen = formData.getAll("provider").map(String).filter(isProviderId);
  // Ticking every service is the same as ticking none: show them all, including any added later.
  const providers = PROVIDER_IDS.filter((p) => chosen.includes(p));
  await savePrefs(user.id, { providers: providers.length === PROVIDER_IDS.length ? [] : providers });
  refresh();
}

export async function setRegionAction(formData: FormData) {
  const user = await getSessionUser();
  const region = formData.get("region");
  if (!user || !isRegionId(region)) return;
  await savePrefs(user.id, { region });
  refresh();
}

export async function setDiscoverAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;
  await savePrefs(user.id, { discover: formData.get("discover") === "on" });
  refresh();
}
