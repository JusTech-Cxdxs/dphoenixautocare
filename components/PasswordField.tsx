'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { passwordHint } from '@/lib/auth/password-rules';

const base =
  'w-full rounded-[var(--ejo-radius-md)] border bg-[var(--ejo-bg)] py-3 pl-4 pr-12 text-sm text-[var(--ejo-text)] outline-none transition-colors placeholder:text-[var(--ejo-text-muted)]/70 focus:border-[var(--ejo-primary)] focus:ring-2 focus:ring-[var(--ejo-primary)]/25';

/** Password box with show/hide, a Caps Lock warning and the right autocomplete hint (from EJO 100). */
export function PasswordField({ id, name, label, value, onChange, autoComplete, invalid, describedBy, autoFocus }: { id: string; name?: string; label: string; value: string; onChange: (v: string) => void; autoComplete: 'current-password' | 'new-password'; invalid?: boolean; describedBy?: string; autoFocus?: boolean }) {
  const [shown, setShown] = useState(false);
  const [caps, setCaps] = useState(false);
  const capsId = useId();
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.('CapsLock') ?? false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--ejo-text)]">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name ?? id}
          type={shown ? 'text' : 'password'}
          required
          maxLength={128}
          value={value}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          onKeyUp={onKey}
          onBlur={() => setCaps(false)}
          placeholder="••••••••••"
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, caps ? capsId : null].filter(Boolean).join(' ') || undefined}
          className={`${base} ${invalid ? 'border-[var(--ejo-error)]' : 'border-[var(--ejo-border)]'}`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[var(--ejo-radius-md)] text-[var(--ejo-text-muted)] transition-colors hover:text-[var(--ejo-text)]"
        >
          {shown ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>
      {caps ? <p id={capsId} className="mt-1.5 text-xs font-medium text-[var(--ejo-warning-text)]" role="status">⇪ Caps Lock is on</p> : null}
    </div>
  );
}

/** A plain-words strength guide for a new password (the same rule the server checks). */
export function StrengthMeter({ password, id }: { password: string; id: string }) {
  if (!password) return <p id={id} className="mt-2 text-xs text-[var(--ejo-text-muted)]">At least 10 characters. A short sentence you will remember works well.</p>;
  const h = passwordHint(password);
  const score = !h.ok ? 1 : password.length >= 16 ? 4 : password.length >= 12 ? 3 : 2;
  const colour = score <= 1 ? 'var(--ejo-error)' : score === 2 ? 'var(--ejo-warning)' : 'var(--ejo-success)';
  return (
    <div id={id} className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: i <= score ? colour : 'var(--ejo-border)' }} />
        ))}
      </div>
      <p className="mt-1 text-xs text-[var(--ejo-text-muted)]">{h.message}</p>
    </div>
  );
}
