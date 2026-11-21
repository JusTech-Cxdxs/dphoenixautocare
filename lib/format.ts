/**
 * Display formats for Nigeria: dates DD/MM/YYYY, times in Africa/Lagos,
 * Naira with thousand separators, mileage in km. Use these everywhere so every
 * screen, PDF and email agrees.
 */
export const TIME_ZONE = 'Africa/Lagos';

const dateFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true });

/** 21/11/2026 */
export function formatDate(value: Date | string | number): string {
  return dateFmt.format(new Date(value));
}

/** 9:05 am, upper-cased to 9:05 AM. */
export function formatTime(value: Date | string | number): string {
  return timeFmt.format(new Date(value)).replace(/\s?(am|pm)$/i, (m) => ` ${m.trim().toUpperCase()}`);
}

/** 21/11/2026, 9:05 AM */
export function formatDateTime(value: Date | string | number): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}


/** The hour of day (0 to 23) in Lagos. */
export function lagosHour(value: Date | string | number = Date.now()): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: 'numeric', hour12: false }).format(new Date(value))) % 24;
}

/**
 * A Nigerian phone number in international digits for links (wa.me, tel:):
 * 0803 123 4567, +234 803 123 4567 and 2348031234567 all become 2348031234567.
 * Returns null when it is not a usable number.
 */
export function phoneDigits(raw: string | null | undefined): string | null {
  const d = (raw ?? '').replace(/\D/g, '');
  if (!d) return null;
  let out = d;
  if (out.startsWith('2340')) out = `234${out.slice(4)}`;
  else if (out.startsWith('0') && out.length === 11) out = `234${out.slice(1)}`;
  else if (out.length === 10 && /^[789]/.test(out)) out = `234${out}`;
  return /^\d{10,15}$/.test(out) ? out : null;
}

/** +234 803 123 4567 for display; anything that is not a Nigerian mobile is returned tidied as typed. */
export function formatPhone(raw: string | null | undefined): string {
  const d = phoneDigits(raw);
  if (d && d.startsWith('234') && d.length === 13) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return (raw ?? '').trim();
}
