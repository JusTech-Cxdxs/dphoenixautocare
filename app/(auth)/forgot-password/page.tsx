import type { Metadata } from 'next';
import { AuthShell } from '@/components/AuthShell';
import { LoadingLink } from '@/components/LoadingLink';
import { ForgotForm } from './forgot-form';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your work email. We will send you a link to choose a new password."
      footer={
        <p className="text-center text-sm">
          <LoadingLink href="/login" className="font-semibold text-[var(--ejo-primary-text)] hover:underline">
            ← Back to sign in
          </LoadingLink>
        </p>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
