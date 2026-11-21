'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize } from '@/lib/authz/server';
import { runAction, type ActionState } from '@/lib/actions';
import { writeAuditLog } from '@/lib/audit/log';
import { SETTINGS_TAG } from '@/lib/settings';
import { checkbox, formObject, percent, text, wholeNumber } from '@/lib/validation';
import { UserError } from '@/lib/errors';

/**
 * Settings are saved one section at a time, so a mistake in one section never
 * blocks another. Owner only. Every save is audited (the data journal keeps the
 * before and after values).
 */

const businessSchema = z.object({
  businessName: text('Registered name', 120),
  displayName: text('Name on screen', 80),
  tagline: text('Tagline', 120),
  phone1: text('Main phone', 30),
  phone2: z.string().trim().max(30).optional(),
  email: z.string().trim().toLowerCase().pipe(z.email('Please enter a valid email address.')),
  address: text('Address', 300),
  openingHours: text('Opening hours', 160),
  website: z.string().trim().pipe(z.url({ protocol: /^https$/, error: 'Please enter a full https:// address.' })),
});

const moneySchema = z
  .object({
    vatEnabled: checkbox,
    vatRatePercent: percent('VAT rate'),
    discountLimitPercent: percent('Discount limit'),
    estimateNeedsOwner: checkbox,
    depositRequired: checkbox,
    depositPercent: z.string().optional(),
  })
  .transform((v, ctx) => {
    let depositPercent: number | null = null;
    if (v.depositRequired) {
      const n = Number(v.depositPercent);
      if (!v.depositPercent?.trim() || !Number.isFinite(n) || n < 1 || n > 100) {
        ctx.addIssue({ code: 'custom', path: ['depositPercent'], message: 'Enter a deposit between 1 and 100 percent.' });
        return z.NEVER;
      }
      depositPercent = Math.round(n * 100) / 100;
    }
    return { vatEnabled: v.vatEnabled, vatRatePercent: v.vatRatePercent, discountLimitPercent: v.discountLimitPercent, estimateNeedsOwner: v.estimateNeedsOwner, depositPercent };
  });

const prefix = (label: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9-]{1,14}$/, `${label}: 2 to 15 capital letters, numbers or dashes, starting with a letter.`);
const numbersSchema = z
  .object({ jobCardPrefix: prefix('Job cards'), invoicePrefix: prefix('Invoices'), receiptPrefix: prefix('Receipts') })
  .refine((v) => new Set([v.jobCardPrefix, v.invoicePrefix, v.receiptPrefix]).size === 3, { message: 'Each document type needs its own prefix.', path: ['receiptPrefix'] });

const modulesSchema = z.object({
  supervisorEnabled: checkbox,
  technicianLoginsEnabled: checkbox,
  securityGateEnabled: checkbox,
  appointmentsEnabled: checkbox,
  supportEnabled: checkbox,
  enyoEnabled: checkbox,
});

const serviceSchema = z.object({
  serviceIntervalKm: wholeNumber('Service interval (km)', 500, 100_000),
  serviceIntervalMonths: wholeNumber('Service interval (months)', 1, 36),
  dueSoonKm: wholeNumber('Due soon (km)', 0, 10_000),
  dueSoonDays: wholeNumber('Due soon (days)', 0, 90),
});

const SECTIONS = {
  business: { label: 'Business details', schema: businessSchema },
  money: { label: 'Money rules', schema: moneySchema },
  numbers: { label: 'Document numbers', schema: numbersSchema },
  modules: { label: 'Optional modules', schema: modulesSchema },
  service: { label: 'Service reminders', schema: serviceSchema },
} as const;
type Section = keyof typeof SECTIONS;

function dataFor(section: Section, raw: Record<string, string>) {
  const parsed = SECTIONS[section].schema.parse(raw);
  if (section === 'business') {
    const b = parsed as z.infer<typeof businessSchema>;
    const { phone1, phone2, ...rest } = b;
    return { ...rest, phones: [phone1, phone2].filter((p): p is string => Boolean(p && p.trim())) };
  }
  return parsed as Record<string, unknown>;
}

/** Only the fields whose value actually changed, as { field: { from, to } }. */
function changedValues(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, to] of Object.entries(after)) {
    const from = before[k];
    const norm = (v: unknown) => (v === null || v === undefined ? null : typeof v === 'object' && 'toString' in (v as object) && !Array.isArray(v) ? Number(String(v)) : v);
    if (JSON.stringify(norm(from)) !== JSON.stringify(norm(to))) out[k] = { from: norm(from), to: norm(to) };
  }
  return out;
}

export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const principal = await authorize('settings.manage', undefined, 'settings.save');
    const section = String(fd.get('section') ?? '') as Section;
    if (!Object.hasOwn(SECTIONS, section)) throw new UserError('Unknown settings section.');
    const data = dataFor(section, formObject(fd));
    await prisma.$transaction(async (tx) => {
      // Read the current values inside the transaction, so the entry shows exactly what changed.
      const before = await tx.setting.findUniqueOrThrow({ where: { id: 1 } });
      await tx.setting.update({ where: { id: 1 }, data: { ...data, updatedById: principal.userId } });
      const changes = changedValues(before as unknown as Record<string, unknown>, data);
      await writeAuditLog({ action: 'settings.updated', entityType: 'Setting', entityId: '1', summary: `${SECTIONS[section].label} updated`, metadata: { section, changes } }, tx);
    });
    revalidateTag(SETTINGS_TAG);
    revalidatePath('/', 'layout');
    return { ok: true, message: `${SECTIONS[section].label} saved.` };
  }, 'settings.save');
}
