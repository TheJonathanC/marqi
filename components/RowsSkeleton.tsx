export function RowsSkeleton() {
  return (
    <div className="skeleton-rows" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="skeleton-row">
          {Array.from({ length: 8 }, (_, j) => (
            <div key={j} />
          ))}
        </div>
      ))}
    </div>
  );
}
