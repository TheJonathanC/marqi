import type { Metadata } from "next";
import { Suspense } from "react";
import { saveLanguagesAction, setDiscoverAction, unhideTitleAction } from "@/app/actions";
import { LANGUAGES } from "@/lib/language";
import { getProfile } from "@/lib/personal";
import { tmdbConfigured } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Tune what shows up across Marqi.</p>
      </div>
      <Suspense fallback={<div className="empty">Loading…</div>}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const profile = await getProfile();
  if (!profile) return <div className="empty">Sign in to change settings.</div>;
  const excluded = new Set(profile.prefs.excludedLanguages);

  return (
    <div className="settings">
      <section>
        <h2>Hide languages</h2>
        <p>
          Titles in these original languages disappear from every row, banner, browse page, search and
          recommendation.
          {!tmdbConfigured() &&
            " Without a TMDB key the language is inferred from the title and audio tracks, so a few titles of unknown language may still slip through."}
        </p>
        <form action={saveLanguagesAction}>
          <div className="lang-grid">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <label key={code} className="lang-chip">
                <input type="checkbox" name="exclude" value={code} defaultChecked={excluded.has(code)} />
                <span>{name}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="tool-btn">
            Save languages
          </button>
        </form>
      </section>

      <section>
        <h2>Discover mode</h2>
        <p>
          Turns off personal recommendations and hides anything you&apos;ve already opened, saved or hidden, so the
          home page shows well-rated titles in genres you don&apos;t usually watch.
        </p>
        <form action={setDiscoverAction}>
          <button
            type="submit"
            name="discover"
            value={profile.prefs.discover ? "off" : "on"}
            className="tool-btn"
            aria-pressed={profile.prefs.discover}
          >
            {profile.prefs.discover ? "Discover is on · Switch to For You" : "Turn on Discover"}
          </button>
        </form>
      </section>

      <section>
        <h2>Not interested</h2>
        {profile.hidden.length === 0 ? (
          <p>Nothing hidden. Use “Not interested” on a title page to keep it out of your rows.</p>
        ) : (
          <ul className="hidden-list">
            {profile.hidden.map((h) => (
              <li key={h.titleId}>
                <span>{h.title}</span>
                <form action={unhideTitleAction}>
                  <input type="hidden" name="titleId" value={h.titleId} />
                  <button type="submit" className="tool-btn subtle">
                    Unhide
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
