import 'server-only';
import { unstable_cache } from 'next/cache';
import type { Setting } from '@prisma/client';
import { prisma } from '@/lib/db';
import type { Business } from '@/lib/email/layout';

/**
 * The single settings row. Read on almost every request (module switches decide
 * the menu and which roles count), so it is cached across requests and
 * refreshed the moment the Owner saves (revalidateTag(SETTINGS_TAG)).
 */
export const SETTINGS_TAG = 'settings';

/** Plain values only (Decimal → number), so the cached copy is serialisable. */
export type Settings = Omit<Setting, 'vatRatePercent' | 'discountLimitPercent' | 'depositPercent'> & {
  vatRatePercent: number;
  discountLimitPercent: number;
  depositPercent: number | null;
};

async function load(): Promise<Settings> {
  // The row is created by the first migration's seed; upsert keeps a fresh database working too.
  const row = await prisma.setting.findUnique({ where: { id: 1 } }) ?? (await prisma.setting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }));
  return {
    ...row,
    vatRatePercent: Number(row.vatRatePercent),
    discountLimitPercent: Number(row.discountLimitPercent),
    depositPercent: row.depositPercent === null ? null : Number(row.depositPercent),
  };
}

const cached = unstable_cache(load, ['settings-v1'], { tags: [SETTINGS_TAG], revalidate: 300 });

export async function getSettings(): Promise<Settings> {
  const s = await cached();
  // unstable_cache returns dates as strings after a round trip.
  return { ...s, updatedAt: new Date(s.updatedAt) };
}

export function businessOf(s: Settings): Business {
  return { displayName: s.displayName, tagline: s.tagline, phones: s.phones, email: s.email, address: s.address, website: s.website };
}
