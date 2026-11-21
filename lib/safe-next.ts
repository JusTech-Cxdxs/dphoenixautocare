/**
 * Where to go after signing in: only a path on THIS site, never another site
 * (open redirect). Browsers strip tabs and new lines from addresses, so
 * "/\t/evil.com" would become "//evil.com"; control characters and
 * backslashes are refused outright, and the result is checked by parsing.
 */
export function safeNext(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || raw.length > 500 || !raw.startsWith('/')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  try {
    const base = 'http://same-site.invalid';
    const u = new URL(raw, base);
    if (u.origin !== base) return fallback;
    if (u.pathname.startsWith('//')) return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}
