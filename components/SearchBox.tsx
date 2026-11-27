"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { Suggestion } from "@/app/api/suggest/route";

const DEBOUNCE_MS = 150;

/**
 * The header search box, with titles suggested as you type. Without
 * JavaScript it's still a plain GET form to /search. Results are remembered
 * per query, so backspacing never waits on the network.
 */
export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const cache = useRef(new Map<string, Suggestion[]>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const term = query.trim();
  const showing = open && term.length >= 2 && items.length > 0;
  // The last option is always "See all results".
  const count = items.length + 1;

  function lookup(value: string) {
    const key = value.trim().toLowerCase();
    if (timer.current) clearTimeout(timer.current);
    inflight.current?.abort();
    setActive(-1);
    if (key.length < 2) return setItems([]);
    const hit = cache.current.get(key);
    if (hit) return setItems(hit);
    timer.current = setTimeout(async () => {
      const ctl = new AbortController();
      inflight.current = ctl;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(key)}`, { signal: ctl.signal });
        if (!res.ok) return;
        const data = (await res.json()) as Suggestion[];
        cache.current.set(key, data);
        setItems(data);
      } catch {
        // Aborted by the next keystroke, or offline: keep what's showing.
      }
    }, DEBOUNCE_MS);
  }

  function go(index: number) {
    setOpen(false);
    if (index >= 0 && index < items.length) router.push(`/title/${items[index].id}`);
    else router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showing) {
      if (e.key === "ArrowDown" && items.length > 0 && term.length >= 2) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // Keep the page's arrow-key navigation out of it while the list is open.
      e.preventDefault();
      e.stopPropagation();
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + count + 1) % (count + 1);
      setActive(next === count ? -1 : next);
      if (next >= 0 && next < items.length) router.prefetch(`/title/${items[next].id}`);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(active);
    } else if (e.key === "Escape") {
      // First Escape closes the list; the next one leaves the box as before.
      e.stopPropagation();
      setOpen(false);
    }
  }

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <>
      <input
        id="q"
        name="q"
        type="search"
        placeholder="Search the programme…"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showing}
        aria-controls={listId}
        aria-activedescendant={showing && active >= 0 ? optionId(active) : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          lookup(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {/* Phones show this shorter placeholder instead; it hides once you type. */}
      <span className="search-short" aria-hidden>
        Search…
      </span>
      <kbd>/</kbd>
      <ul id={listId} role="listbox" aria-label="Suggestions" className="suggest" hidden={!showing}>
        {items.map((s, i) => (
          <li
            key={s.id}
            id={optionId(i)}
            role="option"
            aria-selected={active === i}
            // mousedown, not click: the input would blur and close the list first.
            onMouseDown={(e) => {
              e.preventDefault();
              go(i);
            }}
            onMouseEnter={() => {
              setActive(i);
              router.prefetch(`/title/${s.id}`);
            }}
          >
            <span className="suggest-art">
              {s.poster && (
                // eslint-disable-next-line @next/next/no-img-element -- CDN thumbnail, see components/Art.tsx
                <img src={s.poster} alt="" width={40} height={60} loading="lazy" decoding="async" />
              )}
            </span>
            <span className="suggest-text">
              <span className="suggest-title">
                <Highlight text={s.title} term={term} />
              </span>
              <span className="suggest-sub">
                {s.kind === "show" ? "Series" : "Film"}
                {s.year ? ` · ${s.year}` : ""}
                <span className="badges">
                  {s.providers.map((p) => (
                    <span key={p} className="badge" data-p={p} />
                  ))}
                </span>
              </span>
            </span>
          </li>
        ))}
        <li
          id={optionId(items.length)}
          role="option"
          aria-selected={active === items.length}
          className="suggest-all"
          onMouseDown={(e) => {
            e.preventDefault();
            go(items.length);
          }}
          onMouseEnter={() => setActive(items.length)}
        >
          See all results for “{term}”
        </li>
      </ul>
    </>
  );
}

/** Bolds the part of a title that matches what you typed. */
function Highlight({ text, term }: { text: string; term: string }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + term.length)}</mark>
      {text.slice(at + term.length)}
    </>
  );
}
