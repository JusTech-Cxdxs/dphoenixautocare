import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';
import { AuthNotice } from '@/components/AuthNotice';
import { LoadingLink } from '@/components/LoadingLink';
import { buttonCls } from '@/components/ui/form';

export const metadata: Metadata = { title: 'Confirm your email' };

/** Where an email-confirmation link lands (Better Auth adds ?error= when the link is bad or expired). */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Confirm your email">
      <div className="space-y-5">
        {sp.error ? (
          <AuthNotice kind="error">This confirmation link has expired or was already used. Sign in again and we will email you a fresh one.</AuthNotice>
        ) : (
          <AuthNotice kind="success">Your email address is confirmed. You can sign in now.</AuthNotice>
        )}
        <LoadingLink href="/login" className={buttonCls('primary', true)}>
          Go to sign in
        </LoadingLink>
      </div>
    </AuthShell>
  );
}
