import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { UserError } from './errors';
import { recordError } from './error-events';

/** What every form action returns to its form (useActionState). */
export type ActionState = { ok: boolean; message?: string; fieldErrors?: Record<string, string> } | null;

/** Turns a zod failure into "field → first message". */
export function fieldErrorsOf(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    out[key] ??= issue.message;
  }
  return out;
}

/**
 * The standard wrapper for a form action: safe messages for expected problems
 * (UserError, validation), an error reference for anything unexpected.
 * Redirects and not-found (Next.js control flow) pass straight through.
 */
export async function runAction(fn: () => Promise<ActionState | void>, where: string): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof z.ZodError) return { ok: false, message: 'Please check the highlighted fields.', fieldErrors: fieldErrorsOf(err) };
    if (err instanceof UserError) return { ok: false, message: err.message, fieldErrors: err.fieldErrors };
    const reference = await recordError(err, where);
    return { ok: false, message: `Something went wrong and nothing was saved. Please try again. If it keeps happening, quote reference ${reference}.` };
  }
}
