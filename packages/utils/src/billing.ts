/**
 * What the customer pays on a Job Card estimate, worked out once for every
 * screen, document, email and payment check in both apps (the staff portal
 * and the customer portal). Pure, with no imports, so either app and the
 * tests can load it on its own.
 *
 *   customer lines → each line's discount → subtotal → the whole-estimate
 *   discount → VAT on what is left (when the organisation charges VAT) → total
 *
 * Every step is in whole kobo (integer minor units), so the figures always
 * add up exactly however they are shown. Lines billed to warranty, goodwill
 * or the business are free to the customer: they count for nothing here and
 * their discounts are ignored. A discount never exceeds what it discounts.
 */

export type BillingLine = { amount: unknown; discountAmount?: unknown; billTo?: string | null };

/** The organisation's VAT switch and rate (7.5 = 7.5%). */
export type VatSetting = { vatEnabled: boolean; vatRate: unknown };

export type BillingLineFigures = {
  /** The line's own amount (quantity × unit price). */
  amount: number;
  /** Taken off this line (0 on a line the customer does not pay for). */
  discount: number;
  /** What the customer pays for the line before the estimate's discount and VAT. */
  net: number;
  /** false for warranty, goodwill and internal lines. */
  charged: boolean;
};

export type BillingTotals = {
  /** Customer lines at their full amounts. */
  gross: number;
  lineDiscounts: number;
  /** Customer lines after their own discounts. */
  subtotal: number;
  /** The whole-estimate discount, as applied (never above the subtotal). */
  discountAmount: number;
  /** subtotal − discountAmount: what VAT is charged on. */
  afterDiscount: number;
  /** The VAT rate applied: 0 when VAT is off. */
  vatRate: number;
  vatAmount: number;
  total: number;
  lines: BillingLineFigures[];
};

/** Money in whole kobo. Anything that is not a number counts as 0. */
export function toKobo(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const naira = (kobo: number): number => kobo / 100;

/** A line the customer pays for (no bill-to on older data means the customer). */
export function isCustomerBilled(line: { billTo?: string | null }): boolean {
  return !line.billTo || line.billTo === 'CUSTOMER';
}

/** The one totals calculation (see the top of this file). */
export function billingTotals(input: { lines: readonly BillingLine[]; discountAmount?: unknown; vat?: VatSetting | null }): BillingTotals {
  let gross = 0;
  let lineDiscounts = 0;
  const lines = input.lines.map((l): BillingLineFigures => {
    const amount = Math.max(0, toKobo(l.amount));
    if (!isCustomerBilled(l)) return { amount: naira(amount), discount: 0, net: 0, charged: false };
    const discount = Math.min(amount, Math.max(0, toKobo(l.discountAmount)));
    gross += amount;
    lineDiscounts += discount;
    return { amount: naira(amount), discount: naira(discount), net: naira(amount - discount), charged: true };
  });
  const subtotal = gross - lineDiscounts;
  const discountAmount = Math.min(subtotal, Math.max(0, toKobo(input.discountAmount)));
  const afterDiscount = subtotal - discountAmount;
  // The rate in hundredths of a percent (7.5% = 750), so VAT is whole-number maths rounded once.
  const rateHundredths = input.vat?.vatEnabled ? Math.max(0, Math.round(Number(input.vat.vatRate ?? 0) * 100)) : 0;
  const vatAmount = Math.round((afterDiscount * rateHundredths) / 10000);
  return {
    gross: naira(gross),
    lineDiscounts: naira(lineDiscounts),
    subtotal: naira(subtotal),
    discountAmount: naira(discountAmount),
    afterDiscount: naira(afterDiscount),
    vatRate: rateHundredths / 100,
    vatAmount: naira(vatAmount),
    total: naira(afterDiscount + vatAmount),
    lines,
  };
}

/** The whole-estimate discount as a percentage of the customer subtotal (two decimals). */
export function discountPercent(t: Pick<BillingTotals, 'subtotal' | 'discountAmount'>): number {
  const sub = toKobo(t.subtotal);
  return sub > 0 ? Math.round((toKobo(t.discountAmount) * 10000) / sub) / 100 : 0;
}

/**
 * Does this whole-estimate discount need the Manager's approval? Above
 * `approvalPercent` % of the customer subtotal; with no threshold set,
 * every discount does. No discount needs nothing.
 */
export function discountNeedsManager(t: Pick<BillingTotals, 'subtotal' | 'discountAmount'>, approvalPercent: number | null | undefined): boolean {
  const discount = toKobo(t.discountAmount);
  if (discount <= 0) return false;
  if (approvalPercent === null || approvalPercent === undefined) return true;
  return discount * 100 > toKobo(t.subtotal) * approvalPercent;
}

/** The minimum deposit on a total (e.g. 0.7 of it), to the kobo. */
export function depositOf(total: number, fraction: number): number {
  return naira(Math.round(toKobo(total) * fraction));
}

/** Has `paid` covered `total`? Compared in whole kobo. */
export function paidInFull(paid: number, total: number): boolean {
  return toKobo(paid) >= toKobo(total);
}

/** What is still owed (never negative), to the kobo. */
export function balanceDue(total: number, paid: number): number {
  return naira(Math.max(0, toKobo(total) - toKobo(paid)));
}
