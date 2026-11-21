'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { AuthNotice } from '@/components/AuthNotice';
import { PasswordField } from '@/components/PasswordField';
import { EjoSpinner } from '@/components/EjoSpinner';
import { LoadingLink } from '@/components/LoadingLink';
import { buttonCls, inputCls, labelCls } from '@/components/ui/form';

/** Plain words for every way signing in can fail. Unknown accounts and wrong passwords read the same. */
function explain(err: { status?: number; code?: string; message?: string }): { kind: 'error' | 'info'; text: string } {
  const code = err.code ?? '';
  if (code === 'EMAIL_NOT_VERIFIED') return { kind: 'info', text: 'Please confirm your email address first. We have just emailed you a link.' };
  if (code === 'ACCOUNT_OFF' || code === 'RATE_LIMITED') return { kind: 'error', text: err.message ?? 'Please try again later.' };
  if (err.status === 429) return { kind: 'error', text: 'Too many attempts. Please wait a few minutes, then try again.' };
  if (err.status === 401 || /INVALID_EMAIL_OR_PASSWORD/.test(code)) return { kind: 'error', text: 'That email and password don’t match. Check both and try again, or reset your password.' };
  if ((err.status ?? 0) >= 500) return { kind: 'error', text: 'The sign-in service is having a problem right now. Please try again in a moment.' };
  return { kind: 'error', text: 'We could not sign you in. Please try again.' };
}

export function LoginForm({ next, arrival }: { next: string; arrival?: { kind: 'info' | 'success'; text: string } }) {
  // Until the page's script has loaded, the button stays off: a native submit must never send a password anywhere.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [state, setState] = useState<'idle' | 'working' | 'success'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state !== 'idle') return;
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError({ kind: 'error', text: 'Enter a valid work email address.' });
    if (!password) return setError({ kind: 'error', text: 'Enter your password.' });
    setState('working');
    try {
      const { error: signInError } = await authClient.signIn.email({ email: cleanEmail, password, rememberMe, callbackURL: next });
      if (signInError) {
        setError(explain(signInError));
        setState('idle');
        return;
      }
      setState('success');
      router.replace(next);
      router.refresh();
    } catch {
      setError({ kind: 'error', text: 'Could not reach the server. Check your connection and try again.' });
      setState('idle');
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate aria-label="Sign in" method="post">
      {arrival && !error && state === 'idle' ? <AuthNotice kind={arrival.kind}>{arrival.text}</AuthNotice> : null}
      <div>
        <label htmlFor="email" className={labelCls}>
          Work email
        </label>
        <input id="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="off" spellCheck={false} required maxLength={160} autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" aria-invalid={error?.kind === 'error' || undefined} className={`${inputCls} py-3`} />
      </div>
      <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" invalid={error?.kind === 'error'} />
      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex cursor-pointer select-none items-center gap-2 text-[var(--ejo-text-muted)]">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded" />
          Keep me signed in
        </label>
        <LoadingLink href="/forgot-password" className="font-semibold text-[var(--ejo-primary-text)] hover:underline">
          Forgot password?
        </LoadingLink>
      </div>
      {error ? <AuthNotice kind={error.kind}>{error.text}</AuthNotice> : null}
      {state === 'success' ? <AuthNotice kind="success">Signed in. Opening your dashboard…</AuthNotice> : null}
      <button type="submit" disabled={!ready || state !== 'idle'} className={buttonCls('primary', true)}>
        {state !== 'idle' ? <EjoSpinner /> : null}
        {state === 'working' ? 'Signing in…' : state === 'success' ? 'Opening…' : 'Sign in'}
      </button>
      <p className="text-center text-xs text-[var(--ejo-text-muted)]">New here? The Owner creates your account. Check your email for the welcome message.</p>
    </form>
  );
}
