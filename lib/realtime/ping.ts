/**
 * Instant "something changed" pings over Supabase Realtime (broadcast), adapted
 * from EJO 100.
 *
 * - Carries no business data, only a timestamp. Each browser then reloads its
 *   own data through the normal signed-in, permission-checked server code, so
 *   the channel can never leak anything.
 * - Uses only the public Supabase URL and anon key (designed to be public).
 * - Optional: without those two settings it does nothing, and open pages fall
 *   back to a light 20-second check. A failure never affects the action.
 */
export const REALTIME_TOPIC = 'dpa-changes';

let lastSent = 0;

export async function announceChange(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  // An action often writes several entries at once; one ping is enough.
  const now = Date.now();
  if (now - lastSent < 750) return;
  lastSent = now;
  try {
    await fetch(`${url.replace(/\/$/, '')}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ messages: [{ topic: REALTIME_TOPIC, event: 'changed', payload: { at: now } }] }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Never affects the action; pages still have the regular check.
  }
}
