'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';
import { AuthNotice } from '@/components/AuthNotice';
import { EjoSpinner } from '@/components/EjoSpinner';
import { buttonCls, inputCls, labelCls } from '@/components/ui/form';

export function ForgotForm() {
  // Until the page's script has loaded, the button stays off: a native submit must never send a password anywhere.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return setState({ kind: 'error', text: 'Enter a valid work email address.' });
    setPending(true);
    const { error } = await authClient.requestPasswordReset({ email: clean, redirectTo: '/reset-password' }).catch(() => ({ error: { status: 0 } }));
    setPending(false);
    // The same answer whether or not the address has an account.
    if (error?.status === 429) setState({ kind: 'error', text: 'Too many attempts. Please wait a few minutes, then try again.' });
    else if (error && error.status !== 400) setState({ kind: 'error', text: 'We could not send the link just now. Please try again.' });
    else setState({ kind: 'success', text: 'If that email belongs to an account, a link to choose a new password is on its way. It works for one hour.' });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate aria-label="Forgot password" method="post">
      {state ? <AuthNotice kind={state.kind}>{state.text}</AuthNotice> : null}
      <div>
        <label htmlFor="email" className={labelCls}>
          Work email
        </label>
        <input id="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="off" spellCheck={false} required maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className={`${inputCls} py-3`} />
      </div>
      <button type="submit" disabled={!ready || pending} className={buttonCls('primary', true)}>
        {pending ? <EjoSpinner /> : null}
        {pending ? 'Sending…' : 'Send me a link'}
      </button>
    </form>
  );
}
