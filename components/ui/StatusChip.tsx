import type { ReactNode } from 'react';
import type { Tone } from './tones';

/** A status pill with a coloured dot (from EJO 100). Green done, amber waiting, red problem, blue in progress, grey closed. */
const CHIP: Record<Tone, string> = {
  brand: 'bg-[var(--ejo-primary)]/14 text-[var(--ejo-brand-text-strong)] ring-[var(--ejo-primary)]/30',
  success: 'bg-[var(--ejo-success)]/12 text-[var(--ejo-success-text)] ring-[var(--ejo-success)]/25',
  warning: 'bg-[var(--ejo-warning)]/14 text-[var(--ejo-warning-text)] ring-[var(--ejo-warning)]/30',
  error: 'bg-[var(--ejo-error)]/10 text-[var(--ejo-error-text)] ring-[var(--ejo-error)]/25',
  info: 'bg-[var(--ejo-info)]/12 text-[var(--ejo-info-text)] ring-[var(--ejo-info)]/25',
  neutral: 'bg-[var(--ejo-text-muted)]/12 text-[var(--ejo-muted-strong)] ring-[var(--ejo-text-muted)]/20',
};
const DOT: Record<Tone, string> = {
  brand: 'bg-[var(--ejo-primary)]',
  success: 'bg-[var(--ejo-success)]',
  warning: 'bg-[var(--ejo-warning)]',
  error: 'bg-[var(--ejo-error)]',
  info: 'bg-[var(--ejo-info)]',
  neutral: 'bg-[var(--ejo-text-muted)]',
};

export function StatusChip({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CHIP[tone]} ${className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      <span className="truncate">{children}</span>
    </span>
  );
}
