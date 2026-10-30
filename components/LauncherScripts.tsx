"use client";

import { useEffect } from "react";
import { reportReturn } from "@/app/actions";

// The only client JavaScript Marqi ships, attached once at the layout:
//  1. Dwell timer: after a Watch click, time how long this tab stays hidden
//     and report it when you come back (Page Visibility API).
//  2. Keyboard: "/" to search, arrow keys to move between cards and rows.
export function LauncherScripts() {
  useEffect(() => {
    let pending: string | null = null;
    let hiddenAt: number | null = null;

    function onClick(e: MouseEvent) {
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
      if (typing || e.altKey || e.ctrlKey || e.metaKey) return;

      const card = target.closest<HTMLElement>("[data-card]");
      if (!card || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;

      const row = card.closest<HTMLElement>("[data-row]");
      if (!row) return;
      const cards = [...row.querySelectorAll<HTMLElement>("[data-card]")];
      const index = cards.indexOf(card);
      let next: HTMLElement | undefined;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        next = cards[index + (e.key === "ArrowRight" ? 1 : -1)];
      } else {
        // Grids: move to the card directly above/below. Rows: jump to the
        // nearest card in the previous/next row.
        const rect = card.getBoundingClientRect();
        const down = e.key === "ArrowDown";
        const inGrid = cards.filter((c) => {
          const r = c.getBoundingClientRect();
          return down ? r.top > rect.bottom - 4 : r.bottom < rect.top + 4;
        });
        let pool = inGrid;
        if (pool.length === 0) {
          const rows = [...document.querySelectorAll<HTMLElement>("[data-row]")];
          const other = rows[rows.indexOf(row) + (down ? 1 : -1)];
          pool = other ? [...other.querySelectorAll<HTMLElement>("[data-card]")] : [];
        }
        const nearestY = down
          ? Math.min(...pool.map((c) => c.getBoundingClientRect().top))
          : Math.max(...pool.map((c) => c.getBoundingClientRect().top));
        next = pool
          .filter((c) => Math.abs(c.getBoundingClientRect().top - nearestY) < 4)
          .sort(
            (a, b) =>
              Math.abs(a.getBoundingClientRect().left - rect.left) - Math.abs(b.getBoundingClientRect().left - rect.left),
          )[0];
      }

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
