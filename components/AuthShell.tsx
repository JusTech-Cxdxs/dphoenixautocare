import type { ReactNode } from 'react';
import { Wordmark } from './Wordmark';
import { ThemeToggle } from './ThemeToggle';
import { PoweredByEjo } from './PoweredByEjo';

const ic = (d: ReactNode) => d;

/** What the system runs for the workshop (each person sees only what their role allows). */
const MODULES: { title: string; text: string; icon: ReactNode }[] = [
  { title: 'Job cards', text: 'Check-in to collection: service and repair in one record.', icon: ic(<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z" />) },
  { title: 'Estimates & invoices', text: 'Approvals, payments, credit and statements.', icon: ic(<><path d="M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21l-2.4-1.5L5 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>) },
  { title: 'Fleet management', text: 'Service due by km or date, monthly fleet reports.', icon: ic(<><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>) },
  { title: 'Gate & security', text: 'Vehicles in and out, gate passes with QR codes.', icon: ic(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>) },
  { title: 'Appointments', text: 'Bookings, reminders and service-due messages.', icon: ic(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>) },
  { title: 'Customer portal', text: 'Customers and fleet managers follow every vehicle.', icon: ic(<><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.2A5 5 0 0 1 21 19" /></>) },
  { title: 'Messages & support', text: 'Email and WhatsApp at every step, support requests.', icon: ic(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />) },
  { title: 'Enyo, the assistant', text: 'Answers from your own records.', icon: ic(<><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4z" /><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>) },
];

const ROLES = ['Owner', 'Front desk', 'Supervisors', 'Technicians', 'Security', 'Fleet clients'];

/** What is true of every account, kept true to what the system enforces. */
const PROMISES = ['Access follows your role', 'Approvals go to the Owner', 'Every action on the audit trail', 'Sessions end when access ends'];

/**
 * The frame of every sign-in page (EJO 100's AuthShell): the wordmark and what
 * the system does on the navy brand panel, the form on a calm card, Light /
 * Dark / System in the corner, and the animated "Powered by EJO" signature.
 */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <main id="main" className="flex min-h-dvh bg-[var(--ejo-bg)]">
      <section className="relative hidden w-[46%] flex-col justify-between gap-8 overflow-hidden bg-[var(--ejo-secondary)] p-10 text-white lg:flex xl:p-14" aria-label="D'Phoenix Autocare">
        <div className="ejo-media-placeholder absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[var(--ejo-brand)]/20 blur-3xl" aria-hidden="true" />
        <div className="ejo-rise relative flex items-center justify-between gap-4">
          <Wordmark size="lg" tone="onDark" />
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/75">Staff portal</span>
        </div>

        <div className="ejo-rise relative max-w-xl" style={{ animationDelay: '80ms' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ejo-accent)]">Workshop &amp; fleet system</p>
          <h2 className="mt-3 text-[1.9rem] font-bold leading-tight xl:text-[2.2rem]">
            Restore Life To Your <span className="text-[var(--ejo-accent)]">Vehicle</span>.
          </h2>
          <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4">
            {MODULES.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ejo-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{h.icon}</svg>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{h.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/65">{h.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-7 [@media(max-height:820px)]:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Built for</p>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <span key={r} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/80">{r}</span>
              ))}
            </p>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-white/65">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ejo-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="ejo-rise relative flex items-end justify-between gap-6" style={{ animationDelay: '160ms' }}>
          <PoweredByEjo tone="onDark" size="lg" />
          <p className="text-xs text-white/50">© {year} D&apos;PHOENIX AUTOCARE LIMITED</p>
        </div>
      </section>

      <section className="relative flex w-full flex-col lg:w-[54%]">
        <div className="flex items-center justify-between px-6 pt-6 sm:px-10">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="ejo-rise w-full max-w-[400px]">
            <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--ejo-text)]">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-[var(--ejo-text-muted)]">{subtitle}</p> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 pb-8 text-center sm:px-10">
          <p className="flex items-center gap-1.5 text-xs text-[var(--ejo-text-muted)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            Staff only · access follows your role · every action is recorded
          </p>
          <div className="lg:hidden">
            <PoweredByEjo />
          </div>
        </div>
      </section>
    </main>
  );
}
