"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Scroll-snap carousel. Slides are server-rendered children; this only adds
// autoplay, dots and arrows. Autoplay pauses on hover, focus and hidden tabs,
// and is off entirely for people who prefer reduced motion.
export function Carousel({ children, count, interval = 7000 }: { children: ReactNode; count: number; interval?: number }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + count) % count;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (count < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (paused.current || document.hidden) return;
      const el = track.current;
      if (!el) return;
      const current = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      el.scrollTo({ left: ((current + 1) % count) * el.clientWidth, behavior: "smooth" });
    }, interval);
    return () => clearInterval(id);
  }, [count, interval]);

  const pause = () => (paused.current = true);
  const resume = () => (paused.current = false);

  return (
    <section
      className="banners"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <div className="banner-track" ref={track}>
        {children}
      </div>
      {count > 1 && (
        <div className="banner-controls">
          <button type="button" className="banner-arrow" aria-label="Previous" onClick={() => go(active - 1)}>
            ‹
          </button>
          <div className="banner-dots">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show feature ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button type="button" className="banner-arrow" aria-label="Next" onClick={() => go(active + 1)}>
            ›
          </button>
        </div>
      )}
    </section>
  );
}
