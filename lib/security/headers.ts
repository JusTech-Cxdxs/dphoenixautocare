/**
 * Security headers shared by next.config.ts (static headers) and middleware.ts
 * (the per-request Content-Security-Policy with a fresh nonce). Edge-safe.
 */

/** Browser features this system never uses are switched off on every page. */
export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'bluetooth=()',
  'browsing-topics=()',
  'camera=()',
  'display-capture=()',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'publickey-credentials-get=()',
  'serial=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Scripts run only with this response's nonce (Next.js adds it to its own
 * scripts); 'strict-dynamic' lets them load the app's chunks. Inline styles are
 * allowed because React style attributes need them. Development also needs
 * 'unsafe-eval' for fast refresh.
 */
export function contentSecurityPolicy(nonce: string, supabaseUrl?: string): string {
  const dev = process.env.NODE_ENV !== 'production';
  const realtime = supabaseUrl ? ` ${supabaseUrl.replace(/\/$/, '')} ${supabaseUrl.replace(/^http/, 'ws').replace(/\/$/, '')}` : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${realtime}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}
