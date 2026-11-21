'use client';

import { buttonCls } from '@/components/ui/form';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-[var(--ejo-bg)] px-6">
      <div className="ejo-rise w-full max-w-md rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] p-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--ejo-text)]">Something went wrong</h1>
        <p className="mt-3 text-sm text-[var(--ejo-text-muted)]">Nothing was lost. Please try again. If it keeps happening, call the Owner and quote this reference:</p>
        <p className="mt-4 rounded-[var(--ejo-radius-md)] bg-[var(--ejo-bg)] px-3 py-2 font-mono text-sm text-[var(--ejo-text)] ring-1 ring-[var(--ejo-border)]">{error.digest ?? 'No reference (a problem in the browser)'}</p>
        <button type="button" onClick={reset} className={`${buttonCls('primary', true)} mt-6`}>
          Try again
        </button>
      </div>
    </main>
  );
}
