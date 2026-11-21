'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LoadingLink } from '@/components/LoadingLink';
import { Icon, type IconName } from './Icon';
import { TONE_TEXT, TONE_TILE, type Tone } from './tones';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A number that counts up the first time it scrolls into view (from EJO 100). The server renders the real value. */
export function CountUp({ value, prefix = '', suffix = '', decimals = 0, duration = 900 }: { value: number; prefix?: string; suffix?: string; decimals?: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || reduced() || !Number.isFinite(value) || value === 0) {
      setShown(value);
      return;
    }
    const el = ref.current;
    let raf = 0;
    const run = () => {
      done.current = true;
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setShown(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      setShown(0);
      raf = requestAnimationFrame(step);
    };
    if (!el || typeof IntersectionObserver === 'undefined') {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        run();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  const text = shown.toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref} className="tabular-nums">{prefix}{text}{suffix}</span>;
}

/** One headline number: icon, value (counting up), label and an optional hint. With href the tile is a link that lifts. */
export function StatTile({ icon, label, value, prefix, suffix, decimals, hint, href, tone = 'brand', emphasis = false }: { icon: IconName; label: ReactNode; value: number | string | null; prefix?: string; suffix?: string; decimals?: number; hint?: ReactNode; href?: string; tone?: Tone; emphasis?: boolean }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${TONE_TILE[tone]}`}><Icon name={icon} size={18} /></span>
        {href ? <span className="text-[var(--ejo-text-muted)] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--ejo-primary-text)] group-hover:opacity-100" aria-hidden="true"><Icon name="arrow-right" size={16} /></span> : null}
      </div>
      <p className={`mt-3 break-words text-2xl font-bold leading-none tracking-tight ${emphasis ? TONE_TEXT[tone] : 'text-[var(--ejo-text)]'}`}>
        {value === null ? '—' : typeof value === 'number' ? <CountUp value={value} prefix={prefix} suffix={suffix} decimals={decimals} /> : value}
      </p>
      <p className="mt-1.5 text-[13px] font-medium text-[var(--ejo-text-muted)]">{label}</p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-[var(--ejo-text-muted)]">{hint}</p> : null}
    </>
  );
  const base = 'group relative block min-w-0 overflow-hidden rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] p-4';
  return href ? <LoadingLink href={href} className={`${base} ejo-lift hover:border-[var(--ejo-primary)]/50`}>{body}</LoadingLink> : <div className={base}>{body}</div>;
}
