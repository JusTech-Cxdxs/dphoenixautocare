import type { Instrumentation } from 'next';

/**
 * Every unexpected server error is stored with a reference. The reference is
 * Next.js's error digest, which the error page shows, so what a person reads
 * out on the phone matches the stored record. Node.js runtime only.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { recordError } = await import('./lib/error-events');
    const digest = (err as { digest?: unknown }).digest;
    const rid = request.headers['x-request-id'];
    await recordError(err, request.path, { requestId: typeof rid === 'string' ? rid : null, reference: typeof digest === 'string' && digest ? digest.slice(0, 40) : undefined });
  }
};
