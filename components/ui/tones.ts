/** Tone → classes for icon tiles and chips. Orange (brand) is the default; the others carry meaning only. */
export type Tone = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export const TONE_TILE: Record<Tone, string> = {
  brand: 'bg-[var(--ejo-primary)]/12 text-[var(--ejo-primary-text)] ring-[var(--ejo-primary)]/20',
  success: 'bg-[var(--ejo-success)]/10 text-[var(--ejo-success)] ring-[var(--ejo-success)]/15',
  warning: 'bg-[var(--ejo-warning)]/12 text-[var(--ejo-warning-text)] ring-[var(--ejo-warning)]/20',
  error: 'bg-[var(--ejo-error)]/10 text-[var(--ejo-error)] ring-[var(--ejo-error)]/15',
  info: 'bg-[var(--ejo-info)]/10 text-[var(--ejo-info)] ring-[var(--ejo-info)]/15',
  neutral: 'bg-[var(--ejo-text-muted)]/10 text-[var(--ejo-text-muted)] ring-[var(--ejo-text-muted)]/15',
};

export const TONE_TEXT: Record<Tone, string> = {
  brand: 'text-[var(--ejo-primary-text)]',
  success: 'text-[var(--ejo-success)]',
  warning: 'text-[var(--ejo-warning-text)]',
  error: 'text-[var(--ejo-error)]',
  info: 'text-[var(--ejo-info)]',
  neutral: 'text-[var(--ejo-text-muted)]',
};
