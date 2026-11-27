// Loading placeholders shaped like what replaces them, so nothing jumps when
// the real content streams in. All server-rendered, no client JS; the shimmer
// is CSS and stops under prefers-reduced-motion.

function Bar({ w, h = "0.875rem", className }: { w: string; h?: string; className?: string }) {
  return <span className={`sk ${className ?? ""}`} style={{ width: w, height: h }} />;
}

function Posters({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, j) => (
        <div key={j} className="sk-card">
          <span className="sk sk-poster" />
          <Bar w="80%" h="0.75rem" />
          <Bar w="45%" h="0.625rem" />
        </div>
      ))}
    </>
  );
}

/** Rows of posters, with a heading each (home, Films, Series, More Like This). */
export function RowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="skeleton-rows" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <div className="sk-head">
            <Bar w="11rem" h="1.25rem" />
          </div>
          <div className="skeleton-row">
            <Posters count={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A poster grid (Browse, Search, Seen, My List), optionally under filter pills. */
export function GridSkeleton({ filters = 0, count = 14 }: { filters?: number; count?: number }) {
  return (
    <div aria-hidden>
      {filters > 0 && (
        <div className="filters">
          {Array.from({ length: filters }, (_, i) => (
            <div key={i} className="filter-group">
              <Bar w="4.5rem" h="0.625rem" />
              {Array.from({ length: 5 }, (_, j) => (
                <Bar key={j} w={`${4 + ((i + j) % 3) * 1.5}rem`} h="1.75rem" className="sk-pill" />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="grid">
        <Posters count={count} />
      </div>
    </div>
  );
}

/** The hero of a banner or title page: eyebrow, title, meta, synopsis, tickets. */
function HeroBody({ tools }: { tools?: boolean }) {
  return (
    <div className="hero-body sk-hero-body">
      <Bar w="7rem" h="0.625rem" />
      <Bar w="min(26rem, 80%)" h="2.75rem" />
      <Bar w="12rem" h="0.75rem" />
      <div className="sk-lines">
        <Bar w="100%" />
        <Bar w="95%" />
        <Bar w="70%" />
      </div>
      <div className="actions">
        <Bar w="12rem" h="3.125rem" className="sk-ticket" />
        <Bar w="12rem" h="3.125rem" className="sk-ticket" />
      </div>
      {tools && (
        <div className="title-tools">
          {[8, 9, 6.5, 7.5].map((w) => (
            <Bar key={w} w={`${w}rem`} h="2.125rem" />
          ))}
        </div>
      )}
    </div>
  );
}

export function BannerSkeleton() {
  return (
    <section className="banners" aria-hidden>
      <div className="hero">
        <div className="hero-art sk-art" />
        <HeroBody />
      </div>
    </section>
  );
}

export function TitleSkeleton() {
  return (
    <div className="detail" aria-hidden>
      <section className="hero">
        <div className="hero-art sk-art" />
        <HeroBody tools />
      </section>
      <RowsSkeleton rows={1} />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="settings" aria-hidden>
      {[2, 4, 18].map((chips, i) => (
        <section key={i}>
          <Bar w="14rem" h="1.375rem" />
          <div className="sk-lines">
            <Bar w="min(38rem, 100%)" />
            <Bar w="min(26rem, 80%)" />
          </div>
          <div className="lang-grid">
            {Array.from({ length: chips }, (_, j) => (
              <Bar key={j} w={chips === 2 ? "13rem" : `${5 + (j % 3)}rem`} h={chips === 2 ? "3.75rem" : "1.875rem"} className="sk-pill" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
