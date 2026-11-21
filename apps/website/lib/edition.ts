/**
 * What this edition switches on, for the customer portal (apps/website).
 * Mirrors apps/portal/lib/modules.ts: tests/edition.test.ts fails if the two
 * disagree. D'Phoenix Autocare: no warranty or parts store screens, and no
 * public marketing site (the root opens the customer portal sign-in, as in
 * the Zinox edition), because the business has its own website.
 */
export const EDITION_MODULES = {
  workshop: true,
  inventory: false,
  warranty: false,
  plant: false,
} as const;

export const PUBLIC_WEBSITE = false;

export function moduleOn(key: keyof typeof EDITION_MODULES): boolean {
  return EDITION_MODULES[key];
}
