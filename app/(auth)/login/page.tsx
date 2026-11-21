import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';
import { safeNext } from '@/lib/safe-next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

const ARRIVAL: Record<string, { kind: 'info' | 'success'; text: string }> = {
  'signed-out': { kind: 'info', text: 'Your session ended. Please sign in again.' },
  'password-set': { kind: 'success', text: 'Your password is set. Sign in with it now.' },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your staff account to continue.">
      <LoginForm next={safeNext(sp.next)} arrival={sp.reason ? ARRIVAL[sp.reason] : undefined} />
    </AuthShell>
  );
}
