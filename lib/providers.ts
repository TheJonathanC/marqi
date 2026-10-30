// The only services Marqi knows about. Package IDs are JustWatch's for India;
// Prime's add-on channels (Lionsgate Play, MGM+, ...) have their own package
// IDs, so matching on exactly these three strips them out.
export const PROVIDERS = {
  prv: { id: "prv", packageId: 119, name: "Prime Video", short: "Prime" },
  jhs: { id: "jhs", packageId: 2336, name: "JioHotstar", short: "Hotstar" },
  atp: { id: "atp", packageId: 350, name: "Apple TV", short: "Apple TV" },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

export const COUNTRY = "IN";

// How long the Marqi tab must stay hidden after a Watch click before the
// title is promoted to Continue Watching.
export const DWELL_MINUTES = 10;
