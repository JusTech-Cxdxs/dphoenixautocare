import { z } from 'zod';

/** Shared form field rules (FormData values arrive as strings). */

export const text = (label: string, max = 200) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

export const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean());

/** A number typed in a form. An empty box is "required", never silently 0. */
const typedNumber = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .transform(Number)
    .pipe(z.number({ error: `${label} must be a number.` }).refine(Number.isFinite, `${label} must be a number.`));

export const percent = (label: string) => typedNumber(label).pipe(z.number().min(0, `${label} cannot be below 0.`).max(100, `${label} cannot be above 100.`));

export const wholeNumber = (label: string, min: number, max: number) =>
  typedNumber(label).pipe(z.number().int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be at most ${max}.`));

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .pipe(z.email('Please enter a valid email address.'));

/** Nigerian or international phone, kept as typed but checked for digits. */
export const phone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\+?[\d\s()-]{7,20}$/.test(v), 'Please enter a valid phone number.');

/** Plain object from FormData (repeated keys keep the last value). */
export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string' && !k.startsWith('$ACTION')) out[k] = v;
  return out;
}
