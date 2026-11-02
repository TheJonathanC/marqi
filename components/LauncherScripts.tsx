"use client";

import { useEffect } from "react";
import { reportReturn, setWatchedAction } from "@/app/actions";

const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

// Marqi's shared client script, attached once at the layout:
//  1. Dwell timer: after a Watch click, time how long this tab stays hidden
//     and report it when you come back (Page Visibility API).
//  2. Keyboard: "/" to search, arrow keys to move between cards and rows,
//     and on TV remotes (no pointer) between everything on the page.
//  3. The ✓ watched toggle on poster cards (flips instantly, then saves).

export function LauncherScripts() {
  useEffect(() => {
    // TV browsers driven by a remote have no pointer and no Tab key: arrows are
    // the only way around, so they move focus everywhere, not just between cards.
    const dpad = matchMedia("(pointer: none)");
    let pending: string | null = null;
    let hiddenAt: number | null = null;

    function onClick(e: MouseEvent) {
      const seen = (e.target as Element).closest<HTMLButtonElement>("[data-seen]");
      if (seen && e.type === "click") {
        const next = seen.getAttribute("aria-pressed") !== "true";
        seen.setAttribute("aria-pressed", String(next));
        setWatchedAction(seen.dataset.seen!, next).catch(() => seen.setAttribute("aria-pressed", String(!next)));
        return;
      }
      const link = (e.target as Element).closest<HTMLElement>("[data-watch]");
      if (!link) return;
      pending = link.dataset.watch ?? null;
      hiddenAt = null;
    }

    function onVisibility() {
      if (!pending) return;
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt !== null) {
        const titleId = pending;
        const awayMs = Date.now() - hiddenAt;
        pending = hiddenAt = null;
        reportReturn(titleId, awayMs).catch(() => {});
      }
    }

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable]");

      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("#q")?.focus();
        return;
      }
      if (e.key === "Escape" && typing) {
        (target as HTMLInputElement).blur();
        return;
      }
      // On a remote, Up/Down is the only way out of the search box.
      const leaveField = typing && dpad.matches && (e.key === "ArrowUp" || e.key === "ArrowDown");
      if ((typing && !leaveField) || e.altKey || e.ctrlKey || e.metaKey || !ARROWS.includes(e.key)) return;

      const card = target.closest<HTMLElement>("[data-card]");
      const next = (card && cardNeighbour(card, e.key)) || (dpad.matches ? nearestInDirection(target, e.key) : undefined);
      if (next) {
        e.preventDefault();
        next.focus();
        next.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}

/** Arrow keys between poster cards: along a row, or to the nearest card in the row or grid line above/below. */
function cardNeighbour(card: HTMLElement, key: string): HTMLElement | undefined {
  const row = card.closest<HTMLElement>("[data-row]");
  if (!row) return;
  const cards = [...row.querySelectorAll<HTMLElement>("[data-card]")];
  const index = cards.indexOf(card);

  if (key === "ArrowLeft" || key === "ArrowRight") return cards[index + (key === "ArrowRight" ? 1 : -1)];

  // Grids: move to the card directly above/below. Rows: jump to the
  // nearest card in the previous/next row.
  const rect = card.getBoundingClientRect();
  const down = key === "ArrowDown";
  let pool = cards.filter((c) => {
    const r = c.getBoundingClientRect();
    return down ? r.top > rect.bottom - 4 : r.bottom < rect.top + 4;
  });
  if (pool.length === 0) {
    const rows = [...document.querySelectorAll<HTMLElement>("[data-row]")];
    const other = rows[rows.indexOf(row) + (down ? 1 : -1)];
    pool = other ? [...other.querySelectorAll<HTMLElement>("[data-card]")] : [];
  }
  const nearestY = down
    ? Math.min(...pool.map((c) => c.getBoundingClientRect().top))
    : Math.max(...pool.map((c) => c.getBoundingClientRect().top));
  return pool
    .filter((c) => Math.abs(c.getBoundingClientRect().top - nearestY) < 4)
    .sort(
      (a, b) =>
        Math.abs(a.getBoundingClientRect().left - rect.left) - Math.abs(b.getBoundingClientRect().left - rect.left),
    )[0];
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type="hidden"]), [tabindex]';

/** Spatial navigation: the closest focusable element in the arrow's direction, favouring ones in line. */
function nearestInDirection(from: HTMLElement, key: string): HTMLElement | undefined {
  // Nothing focused yet: start from the top-left corner of the page.
  const r = from === document.body ? new DOMRect(0, 0, 0, 0) : from.getBoundingClientRect();
  let best: HTMLElement | undefined;
  let bestScore = Infinity;
  for (const el of document.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el === from || el.tabIndex < 0 || el.closest("[inert], [aria-hidden='true']")) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    // Distance along the arrow, and how far out of line the element sits.
    let along: number;
    let across: number;
    if (key === "ArrowDown") [along, across] = [b.top - r.bottom, offset(b.left, b.right, r.left, r.right)];
    else if (key === "ArrowUp") [along, across] = [r.top - b.bottom, offset(b.left, b.right, r.left, r.right)];
    else if (key === "ArrowRight") [along, across] = [b.left - r.right, offset(b.top, b.bottom, r.top, r.bottom)];
    else [along, across] = [r.left - b.right, offset(b.top, b.bottom, r.top, r.bottom)];
    if (along < -1) continue;
    // The sticky header is always on screen, but it belongs at the top of the
    // page: going up, reach it only after everything scrolled out above.
    if (key === "ArrowUp" && el.closest(".header") && !from.closest(".header")) along += scrollY;
    const score = along + across * 3;
    if (score < bestScore) [best, bestScore] = [el, score];
  }
  return best;
}

/** Gap between two ranges on one axis; 0 when they overlap. */
function offset(start: number, end: number, fromStart: number, fromEnd: number) {
  return Math.max(0, start - fromEnd, fromStart - end);
}
