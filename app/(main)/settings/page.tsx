import type { Metadata } from "next";
import { Suspense } from "react";
import {
  saveLanguagesAction,
  saveProvidersAction,
  setDiscoverAction,
  setRegionAction,
  unhideTitleAction,
} from "@/app/actions";
import { LANGUAGES } from "@/lib/language";
import { getProfile } from "@/lib/personal";
import {
  PROVIDERS,
  PROVIDER_IDS,
  REGIONS,
  REGION_IDS,
  inRegion,
  providerList,
  regionsFor,
  resolveScope,
} from "@/lib/providers";
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
  const chosen = new Set(profile.prefs.languages);
  const scope = resolveScope(profile.prefs);
  const here = REGIONS[scope.region];
  // Nothing saved means every service, so show them all ticked.
  const platforms = new Set(profile.prefs.providers.length ? profile.prefs.providers : PROVIDER_IDS);

  return (
    <div className="settings">
      <section id="region">
        <h2>Where you&apos;re watching</h2>
        <p>
          Listings, Watch tickets and links follow the region you pick here. Switch when you travel: everything you
          watch, save and mark comes with you.
        </p>
        <form action={setRegionAction} className="region-switch">
          {REGION_IDS.map((r) => (
            <button key={r} type="submit" name="region" value={r} aria-pressed={scope.region === r}>
              <strong>{REGIONS[r].short}</strong>
              <small>
                {REGIONS[r].providers.map((p) => (
                  <span key={p} className="badge" data-p={p} title={PROVIDERS[p].name} />
                ))}
                {providerList(REGIONS[r].providers)}
              </small>
            </button>
          ))}
        </form>
      </section>

      <section>
        <h2>Your platforms</h2>
        <p>
          Only titles on these services show up anywhere in Marqi, and only their Watch tickets appear. Leave
          everything ticked to see them all.
        </p>
        <form action={saveProvidersAction}>
          <div className="lang-grid">
            {PROVIDER_IDS.map((p) => {
              const missing = !inRegion(p, scope.region);
              return (
                <label key={p} className="lang-chip provider-chip" data-p={p}>
                  <input type="checkbox" name="provider" value={p} defaultChecked={platforms.has(p)} />
                  <span>
                    {PROVIDERS[p].name}
                    {missing && <small>{regionsFor(p).map((r) => REGIONS[r].short).join(", ")} only</small>}
                  </span>
                </label>
              );
            })}
          </div>
          {scope.unavailable.length > 0 && (
            <p className="settings-note">
              {providerList(scope.unavailable)} {scope.unavailable.length === 1 ? "isn't" : "aren't"} available in{" "}
              {here.name}, so {scope.unavailable.length === 1 ? "it's" : "they're"} skipped while you&apos;re there
              {scope.fallback
                ? `. That leaves none of your platforms, so Marqi shows everything on ${providerList(scope.catalog.providers)} instead.`
                : ". Your choice is kept for when you're back."}
            </p>
          )}
          <button type="submit" className="tool-btn">
            Save platforms
          </button>
        </form>
      </section>

      <section>
        <h2>Languages you watch</h2>
        <p>
          Only titles in these original languages show up in rows, banners, Browse, search and recommendations.
          Leave everything unticked to see every language.
          {!tmdbConfigured() &&
            " Without a TMDB key the language is inferred from the title and audio tracks, and titles Marqi can't place stay visible."}
        </p>
        <form action={saveLanguagesAction}>
          <div className="lang-grid">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <label key={code} className="lang-chip">
                <input type="checkbox" name="language" value={code} defaultChecked={chosen.has(code)} />
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

      {/* The header drops its Sign out button on phones; it's always here. */}
      <section>
        <h2>Account</h2>
        <form action="/auth/logout" method="post">
          <button type="submit" className="tool-btn subtle">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
