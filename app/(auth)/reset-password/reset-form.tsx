'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { passwordHint } from '@/lib/auth/password-rules';
import { AuthNotice } from '@/components/AuthNotice';
import { PasswordField, StrengthMeter } from '@/components/PasswordField';
import { EjoSpinner } from '@/components/EjoSpinner';
import { buttonCls } from '@/components/ui/form';

export function ResetForm({ token }: { token: string }) {
  // Until the page's script has loaded, the button stays off: a native submit must never send a password anywhere.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError('The two passwords are not the same.');
    const h = passwordHint(password);
    if (!h.ok) return setError(h.message);
    setError(null);
    setPending(true);
    const { error: err } = await authClient.resetPassword({ newPassword: password, token }).catch(() => ({ error: { status: 0, code: '', message: '' } }));
    setPending(false);
    if (!err) {
      router.replace('/login?reason=password-set');
      return;
    }
    if (err.code === 'INVALID_TOKEN') setError('This link has expired or was already used. Ask for a new one.');
    else if (err.status === 429) setError('Too many attempts. Please wait a few minutes, then try again.');
    else setError(err.message || 'We could not save your password. Please try again.');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate aria-label="Choose a password" method="post">
      {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
      <div>
        <PasswordField id="password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="password-strength" autoFocus />
        <StrengthMeter password={password} id="password-strength" />
      </div>
      <PasswordField id="confirm" label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={Boolean(confirm) && confirm !== password} />
      <button type="submit" disabled={!ready || pending} className={buttonCls('primary', true)}>
        {pending ? <EjoSpinner /> : null}
        {pending ? 'Saving…' : 'Save my password'}
      </button>
    </form>
  );
}
