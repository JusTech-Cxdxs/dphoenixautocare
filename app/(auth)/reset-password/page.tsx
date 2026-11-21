import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';
import { AuthNotice } from '@/components/AuthNotice';
import { LoadingLink } from '@/components/LoadingLink';
import { buttonCls } from '@/components/ui/form';
import { ResetForm } from './reset-form';

export const metadata: Metadata = { title: 'Choose a password' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string; welcome?: string }> }) {
  const sp = await searchParams;
  const welcome = sp.welcome === '1';
  const token = typeof sp.token === 'string' && /^[A-Za-z0-9_-]{16,200}$/.test(sp.token) ? sp.token : null;
  return (
    <AuthShell title={welcome ? 'Welcome! Choose your password' : 'Choose a new password'} subtitle="Use at least 10 characters. A short sentence you will remember works well.">
      {sp.error || !token ? (
        <div className="space-y-5">
          <AuthNotice kind="error">This link has expired or was already used. Ask for a new one{welcome ? ', or ask the Owner to send a new invitation' : ''}.</AuthNotice>
          <LoadingLink href="/forgot-password" className={buttonCls('secondary', true)}>
            Send me a new link
          </LoadingLink>
        </div>
      ) : (
        <ResetForm token={token} />
      )}
    </AuthShell>
  );
}
