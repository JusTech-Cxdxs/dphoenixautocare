/**
 * The public address of this app (no trailing slash), read at run time so one
 * build works on any address. It is Better Auth's own BETTER_AUTH_URL.
 */
export function appUrl(): string {
  return (process.env.BETTER_AUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export const isProduction = process.env.NODE_ENV === 'production';
