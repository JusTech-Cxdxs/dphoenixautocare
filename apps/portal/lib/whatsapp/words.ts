/**
 * The small pieces of an automatic WhatsApp message (pure): the record
 * ("Job Card JC-2026-000123"), the vehicle with its plate, money as
 * ₦12,345.00 and dates in Lagos — the same words as the emails and the
 * click-to-send messages (lib/whatsapp-messages).
 */
import { nairaText } from '../whatsapp-messages';

export { nairaText, vehicleText } from '../whatsapp-messages';

/** "Job Card JC-2026-000123" */
export const jobRecord = (jobNumber: string) => `Job Card ${jobNumber}`;
/** "Vehicle Service VS-2026-000045" */
export const serviceRecord = (serviceNumber: string) => `Vehicle Service ${serviceNumber}`;

/** "20 November 2026", in Lagos. */
export function waDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });
}

/** "Friday, 4 December 2026", in Lagos. */
export function waLongDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });
}

/** The details line of a staff notice: "Customer: … Vehicle: …", from label/value pairs, empty ones left out. */
export function detailsLine(pairs: readonly (readonly [string, string | null | undefined])[]): string {
  return pairs.filter(([, v]) => v && String(v).trim()).map(([k, v]) => `${k}: ${String(v).trim()}.`).join(' ') || '-';
}

/** The estimate's "To start the work:" line. */
export function depositSentence(deposit: number): string {
  return deposit > 0 ? `a deposit of ${nairaText(deposit)} is needed once you approve, then we begin.` : 'we begin as soon as you approve it.';
}

/** The "Balance:" line of an invoice or a receipt. */
export function balanceSentence(balance: number, dueOn?: Date | null): string {
  if (balance <= 0) return 'nothing more is owed. Thank you.';
  return `${nairaText(balance)} still to pay${dueOn ? `, by ${waDate(dueOn)}` : ''}.`;
}
