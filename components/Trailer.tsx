"use client";

import { useRef, useState } from "react";

// Trailer in a cinema-style overlay. The YouTube player is only created when
// the overlay opens and is removed when it closes, so nothing heavy loads
// until you press play, and closing stops playback.
export function TrailerButton({ videoId, title }: { videoId: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ticket ticket-trailer"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        <TrailerTicketBody label="Watch trailer" />
      </button>
      <dialog
        ref={dialog}
        className="trailer-dialog"
        aria-label={`${title} trailer`}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <div className="trailer-frame">
          {open && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1`}
              title={`${title} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
        <form method="dialog">
          <button className="trailer-close" aria-label="Close trailer">
            ✕
          </button>
        </form>
      </dialog>
    </>
  );
}

export function TrailerTicketBody({ label }: { label: string }) {
  return (
    <>
      <span className="ticket-main">
        <small>Coming attraction</small>
        {label}
      </span>
      <span className="ticket-stub" aria-hidden>
        ▶
      </span>
    </>
  );
}
