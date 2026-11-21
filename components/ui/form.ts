/** Form and button classes shared by every page (the EJO 100 look, D'Phoenix colours). */
export const labelCls = 'mb-1.5 block text-sm font-medium text-[var(--ejo-text)]';
export const inputCls =
  'block w-full rounded-[var(--ejo-radius-md)] border border-[var(--ejo-border)] bg-[var(--ejo-bg)] px-3.5 py-2.5 text-sm text-[var(--ejo-text)] outline-none transition-colors placeholder:text-[var(--ejo-text-muted)]/70 focus:border-[var(--ejo-primary)] focus:ring-2 focus:ring-[var(--ejo-primary)]/25 aria-[invalid=true]:border-[var(--ejo-error)]';
export const hintCls = 'mt-1.5 text-xs text-[var(--ejo-text-muted)]';
export const errorCls = 'mt-1.5 text-xs font-medium text-[var(--ejo-error)]';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-[var(--ejo-primary)] text-[var(--ejo-on-primary)] shadow-sm shadow-[var(--ejo-primary)]/25 hover:bg-[var(--brand-orange-hover)]',
  secondary: 'border border-[var(--ejo-border)] bg-[var(--ejo-bg)] text-[var(--ejo-text)] hover:border-[var(--ejo-primary)]/60 hover:text-[var(--ejo-primary-text)]',
  danger: 'border border-[var(--ejo-error)]/40 bg-[var(--ejo-error)]/8 text-[var(--ejo-error)] hover:bg-[var(--ejo-error)]/14',
  ghost: 'text-[var(--ejo-text-muted)] hover:bg-[var(--ejo-surface)] hover:text-[var(--ejo-text)]',
};
export function buttonCls(variant: Variant = 'primary', full = false): string {
  return `ejo-press inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--ejo-radius-md)] px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${full ? 'w-full py-3' : ''} ${VARIANT[variant]}`;
}
