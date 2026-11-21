import type { ReactNode } from 'react';
import { LoadingLink } from '@/components/LoadingLink';
import { Icon, type IconName } from './Icon';

/**
 * The top of every page (from EJO 100): an icon tile, the title (the page's
 * one <h1>), a short description and the page's main actions, on a soft
 * orange-tinted surface with a slowly drifting glow.
 *
 *  hero     bigger, with the animated ring around the icon (the dashboard)
 *  plain    just the title row, no box (list pages, as EJO's Users page)
 *  back     a small "← Back to …" link above the header
 *  eyebrow  a tiny line above the title
 *  meta     chips under the description
 */
export function PageHeader({ icon, title, description, actions, back, eyebrow, meta, hero = false, plain = false }: { icon: IconName; title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: ReactNode }; eyebrow?: ReactNode; meta?: ReactNode; hero?: boolean; plain?: boolean }) {
  return (
    <div className="mb-6">
      {back ? <BackLink href={back.href} label={back.label} className="mb-3" /> : null}
      {!plain ? (
        <section className={`ejo-hero relative overflow-hidden rounded-[var(--ejo-radius-xl)] border border-[var(--ejo-border)] ${hero ? 'p-5 sm:p-8' : 'p-4 sm:p-6'}`}>
          <div className="ejo-orb pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--ejo-primary)]/15 blur-3xl" aria-hidden="true" />
          <div className="ejo-orb ejo-orb-slow pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[var(--ejo-brand)]/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-wrap items-start gap-4 sm:gap-5">
            {hero ? (
              <div className="relative hidden h-16 w-16 shrink-0 items-center justify-center sm:flex">
                <span className="ejo-spin absolute inset-0 rounded-full border-2 border-dashed border-[var(--ejo-primary)]/45" aria-hidden="true" />
                <span className="ejo-glow absolute inset-2 rounded-full bg-[var(--ejo-primary)]/30 blur-md" aria-hidden="true" />
                <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--ejo-surface)] text-[var(--ejo-primary-text)] shadow-sm"><Icon name={icon} size={22} /></span>
              </div>
            ) : null}
            <span className={`${hero ? 'flex sm:hidden' : 'flex'} h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ejo-primary)]/12 text-[var(--ejo-primary-text)] ring-1 ring-[var(--ejo-primary)]/20`}><Icon name={icon} size={22} /></span>
            <HeaderText eyebrow={eyebrow} title={title} description={description} meta={meta} hero={hero} />
            {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
          </div>
        </section>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1 basis-80">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ejo-primary)]/12 text-[var(--ejo-primary-text)] ring-1 ring-[var(--ejo-primary)]/20"><Icon name={icon} size={20} /></span>
              <h1 className="min-w-0 break-words text-xl font-bold leading-tight text-[var(--ejo-text)] sm:text-2xl">{title}</h1>
            </div>
            {eyebrow ? <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ejo-text-muted)]">{eyebrow}</p> : null}
            {description ? <div className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--ejo-text-muted)]">{description}</div> : null}
            {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}
    </div>
  );
}

function HeaderText({ eyebrow, title, description, meta, hero }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; meta?: ReactNode; hero?: boolean }) {
  return (
    <div className="min-w-0 flex-1 basis-56">
      {eyebrow ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ejo-text-muted)]">{eyebrow}</p> : null}
      <h1 className={`break-words font-bold leading-tight text-[var(--ejo-text)] ${hero ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}>{title}</h1>
      {description ? <div className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--ejo-text-muted)]">{description}</div> : null}
      {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
    </div>
  );
}

/** The orange call to action used in page headers ("Add staff member"). */
export function HeaderAction({ href, children, icon = 'plus', variant = 'primary' }: { href: string; children: ReactNode; icon?: IconName; variant?: 'primary' | 'secondary' }) {
  return (
    <LoadingLink
      href={href}
      className={
        variant === 'primary'
          ? 'ejo-press inline-flex min-h-10 items-center gap-1.5 rounded-[var(--ejo-radius-md)] bg-[var(--ejo-primary)] px-4 py-2 text-sm font-semibold text-[var(--ejo-on-primary)] shadow-sm shadow-[var(--ejo-primary)]/25 transition hover:bg-[var(--brand-orange-hover)]'
          : 'ejo-press inline-flex min-h-10 items-center gap-1.5 rounded-[var(--ejo-radius-md)] border border-[var(--ejo-border)] bg-[var(--ejo-bg)] px-4 py-2 text-sm font-medium text-[var(--ejo-text)] transition hover:border-[var(--ejo-primary)]/60 hover:text-[var(--ejo-primary-text)]'
      }
    >
      <Icon name={icon} size={16} />
      {children}
    </LoadingLink>
  );
}

/** "← Back to …" above a page. */
export function BackLink({ href, label, className = 'mb-4' }: { href: string; label: ReactNode; className?: string }) {
  return (
    <LoadingLink href={href} className={`group inline-flex items-center gap-1.5 text-sm text-[var(--ejo-text-muted)] transition-colors hover:text-[var(--ejo-primary-text)] ${className}`}>
      <span aria-hidden="true" className="inline-flex transition-transform group-hover:-translate-x-0.5"><Icon name="arrow-left" size={15} /></span>
      {label}
    </LoadingLink>
  );
}
