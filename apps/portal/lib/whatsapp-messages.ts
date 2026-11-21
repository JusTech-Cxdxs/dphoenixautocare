/**
 * The messages behind "Send on WhatsApp" (pure): a colleague clicks, WhatsApp
 * opens on their own phone or computer with the message written, and they
 * send it themselves — the server sends nothing. One builder per moment the
 * customer is contacted, next to the email the portal already sends: the
 * service reminder (Service Tracker and the vehicle's page), "ready for
 * collection" (the Job Card and Vehicles in custody), the invoice and the
 * payment receipt. Plain words, money as ₦12,345.00, the workshop's own
 * number to call back.
 *
 * The link itself is @ejo/utils/whatsapp whatsAppShareUrlFor: no usable
 * phone, no link, and the button is not shown.
 */
import { whatsAppShareUrlFor } from '@ejo/utils/whatsapp';

/** ₦12,345.00 */
export function nairaText(amount: number | string | { toString(): string } | null | undefined): string {
  const n = Number(amount === null || amount === undefined ? 0 : typeof amount === 'number' ? amount : amount.toString());
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe < 0 ? '-' : ''}₦${Math.abs(safe).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 21 November 2026, in Lagos. */
const dayText = (d: Date) => d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });

/** "Hello Tolani" for a person; "Hello" and the company for an organisation. */
function greeting(customerName: string, organisation: boolean): string {
  const name = customerName.trim();
  if (!name) return 'Hello,';
  return organisation ? `Hello ${name},` : `Hello ${name.split(/\s+/)[0]},`;
}

/** "Toyota Hilux (EKY 123 AB)" */
export function vehicleText(v: { make?: string | null; model?: string | null; plateNumber?: string | null }): string {
  const name = [v.make, v.model].filter(Boolean).join(' ') || 'vehicle';
  return v.plateNumber ? `${name} (${v.plateNumber})` : name;
}

/** The workshop's sign-off: its name and the first number to call. */
export type WorkshopContact = { name: string; phone: string | null };
const signOff = (w: WorkshopContact) => (w.phone ? `${w.name}\nCall or WhatsApp us: ${w.phone}` : w.name);

export function serviceReminderMessage(o: {
  customerName: string; organisation?: boolean; vehicle: { make?: string | null; model?: string | null; plateNumber?: string | null };
  dueOdometer: number | null; dueDate: Date | null; overdue: boolean; workshop: WorkshopContact;
}): string {
  const due = [o.dueOdometer !== null ? `${o.dueOdometer.toLocaleString('en-NG')} km` : null, o.dueDate ? dayText(o.dueDate) : null].filter(Boolean).join(' or ');
  return [
    greeting(o.customerName, Boolean(o.organisation)),
    o.overdue
      ? `Your ${vehicleText(o.vehicle)} is now past its service${due ? ` (it was due at ${due}, whichever came first)` : ''}.`
      : `Your ${vehicleText(o.vehicle)} is due for its service${due ? ` at ${due}, whichever comes first` : ' soon'}.`,
    'Reply to this message or call us to book a convenient day.',
    signOff(o.workshop),
  ].join('\n');
}

export function readyForCollectionMessage(o: {
  customerName: string; organisation?: boolean; vehicle: { make?: string | null; model?: string | null; plateNumber?: string | null };
  jobNumber: string; balance: number; onCredit?: boolean; workshop: WorkshopContact & { address?: string | null };
}): string {
  return [
    greeting(o.customerName, Boolean(o.organisation)),
    `Your ${vehicleText(o.vehicle)} is ready for collection (Job Card ${o.jobNumber}).`,
    o.balance > 0 ? (o.onCredit ? `The invoice of ${nairaText(o.balance)} goes on your account, by your payment terms.` : `The balance to pay on collection is ${nairaText(o.balance)}.`) : 'Everything is paid.',
    o.workshop.address ? `Collect it from ${o.workshop.address}.` : null,
    signOff(o.workshop),
  ].filter(Boolean).join('\n');
}

export function invoiceMessage(o: {
  customerName: string; organisation?: boolean; invoiceNumber: string; jobNumber: string; total: number; balance: number; dueOn: Date | null; portalUrl: string | null; workshop: WorkshopContact;
}): string {
  return [
    greeting(o.customerName, Boolean(o.organisation)),
    `Your invoice ${o.invoiceNumber} for Job Card ${o.jobNumber} is ${nairaText(o.total)}.`,
    o.balance > 0 ? `Balance to pay: ${nairaText(o.balance)}${o.dueOn ? `, by ${dayText(o.dueOn)}` : ''}.` : 'It is paid in full. Thank you.',
    o.portalUrl ? `See it, and print it, in your customer portal: ${o.portalUrl}` : null,
    signOff(o.workshop),
  ].filter(Boolean).join('\n');
}

export function receiptMessage(o: {
  customerName: string; organisation?: boolean; receiptNumber: string; amount: number; jobNumber: string; paidAt: Date; balance: number; workshop: WorkshopContact;
}): string {
  return [
    greeting(o.customerName, Boolean(o.organisation)),
    `We have received ${nairaText(o.amount)} on ${dayText(o.paidAt)} for Job Card ${o.jobNumber}. Your receipt number is ${o.receiptNumber}.`,
    o.balance > 0 ? `Balance still to pay: ${nairaText(o.balance)}.` : 'Nothing more is owed on this Job Card. Thank you.',
    signOff(o.workshop),
  ].join('\n');
}

/** The wa.me link for a customer (their main phone, then the other one), or null: then no button. */
export function customerWhatsAppUrl(customer: { phone?: string | null; altPhone?: string | null }, text: string): string | null {
  return whatsAppShareUrlFor([customer.phone, customer.altPhone], text);
}
