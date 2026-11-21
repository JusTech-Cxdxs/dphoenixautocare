import type { NextConfig } from 'next';
import { PERMISSIONS_POLICY } from './lib/security/headers';

/**
 * A production deploy stops at build time when a required setting is missing,
 * instead of running with broken links or no secret. The previous deploy stays live.
 */
const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'DIRECT_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'SMTP_HOST', 'SMTP_FROM'];
if (process.env.VERCEL_ENV === 'production') {
  const missing = REQUIRED_IN_PRODUCTION.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing environment variables for production: ${missing.join(', ')}. Set them in Vercel → Settings → Environment Variables, then redeploy.`);
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Forms with photos come later; keep the default small until then.
    serverActions: { bodySizeLimit: '1mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
      // The logo is shown inside emails, which load it from another site.
      { source: '/brand/:path*', headers: [{ key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' }, { key: 'Cache-Control', value: 'public, max-age=86400' }] },
    ];
  },
};

export default nextConfig;
