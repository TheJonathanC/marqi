import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/session";

export function Header() {
  return (
    <header className="header">
      <Link href="/" className="marquee" aria-label="Marqi home">
        MARQI
      </Link>
      <nav className="nav" aria-label="Main">
        <Link href="/">Now Showing</Link>
        <Link href="/browse">Browse</Link>
        <Link href="/browse?kind=movie">Films</Link>
        <Link href="/browse?kind=show">Series</Link>
        <Link href="/list">My List</Link>
      </nav>
      <form action="/search" className="search" role="search">
        <label htmlFor="q" className="visually-hidden">
          Search titles
        </label>
        <input id="q" name="q" type="search" placeholder="Search the programme…" autoComplete="off" />
        <kbd>/</kbd>
      </form>
      <Suspense fallback={<div className="user-skeleton" />}>
        <UserMenu />
      </Suspense>
    </header>
  );
}

async function UserMenu() {
  const user = await getViewer();
  if (!user) return null;
  return (
    <form action="/auth/logout" method="post" className="user">
      {user.avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" width={28} height={28} />
      )}
      <span>{user.name ?? user.login}</span>
      <Link href="/settings" className="settings-link" aria-label="Settings" title="Settings">
        ⚙
      </Link>
      <button type="submit">Sign out</button>
    </form>
  );
}
