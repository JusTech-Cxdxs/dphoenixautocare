'use client';

/** Last-resort page when the root layout itself fails. Plain styles: the app's CSS may not have loaded. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-NG">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#F3F4F6', color: '#0A1628', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ maxWidth: 420, background: '#fff', padding: 32, borderRadius: 12, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
          <p>Please try again. If it keeps happening, quote this reference:</p>
          <p style={{ fontFamily: 'monospace', background: '#F3F4F6', padding: 8, borderRadius: 8 }}>{error.digest ?? 'none'}</p>
          <button type="button" onClick={reset} style={{ background: '#F09E2C', color: '#0A1628', border: 0, borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
