import { LoadingLink } from '@/components/LoadingLink';
import { buttonCls } from '@/components/ui/form';

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-[var(--ejo-bg)] px-6">
      <div className="ejo-rise w-full max-w-md rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--ejo-text)]">Page not found</h1>
        <p className="mt-3 text-sm text-[var(--ejo-text-muted)]">This page does not exist, or you do not have access to it.</p>
        <LoadingLink href="/dashboard" className={`${buttonCls('primary', true)} mt-6`}>
          Go to the dashboard
        </LoadingLink>
      </div>
    </main>
  );
}
