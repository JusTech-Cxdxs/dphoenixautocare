import type { ReactNode } from 'react';

const STYLE = {
  error: { box: 'border-[var(--ejo-error)]/30 bg-[var(--ejo-error)]/[0.07] text-[var(--ejo-error)]', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></> },
  success: { box: 'border-[var(--ejo-success)]/30 bg-[var(--ejo-success)]/[0.08] text-[var(--ejo-success)]', icon: <><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></> },
  info: { box: 'border-[var(--ejo-info)]/30 bg-[var(--ejo-info)]/[0.07] text-[var(--ejo-info)]', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></> },
} as const;

/** A message box (from EJO 100): error (announced at once), success or info. */
export function AuthNotice({ kind, children }: { kind: keyof typeof STYLE; children: ReactNode }) {
  const s = STYLE[kind];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`ejo-rise flex items-start gap-2.5 rounded-[var(--ejo-radius-md)] border px-3.5 py-3 text-sm leading-snug ${s.box}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0" aria-hidden="true">{s.icon}</svg>
      <div className="min-w-0 text-[var(--ejo-text)]">{children}</div>
    </div>
  );
}
