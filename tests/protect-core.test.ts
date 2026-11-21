import { describe, expect, it } from 'vitest';
import { accountOf, AUTH_GUARDS, ipBucket, isLocalAppUrl, limitScale, loggableEmail, trustedClientIp } from '@/lib/security/protect-core';
import { safeNext } from '@/lib/safe-next';

const headers = (h: Record<string, string>) => (n: string) => h[n] ?? null;

describe('abuse protection', () => {
  it('trusts only headers a client cannot forge', () => {
    const forged = headers({ 'x-forwarded-for': '6.6.6.6', 'cf-connecting-ip': '7.7.7.7' });
    expect(trustedClientIp(forged, {})).toBe('unknown');
    expect(trustedClientIp(headers({ 'x-vercel-forwarded-for': '41.58.1.2, 10.0.0.1' }), { VERCEL: '1' })).toBe('41.58.1.2');
    expect(trustedClientIp(headers({ 'cf-connecting-ip': '41.58.1.3' }), { TRUST_CLOUDFLARE: '1' })).toBe('41.58.1.3');
    expect(trustedClientIp(headers({ 'x-forwarded-for': 'not an ip' }), { TRUSTED_PROXY: '1' })).toBe('unknown');
  });

  it('counts IPv6 per /64, so one line cannot rotate addresses', () => {
    expect(ipBucket('41.58.1.2')).toBe('41.58.1.2');
    expect(ipBucket('2001:db8:85a3:12:1:2:3:4')).toBe('2001:db8:85a3:12::/64');
    expect(ipBucket('2001:db8:85a3:12:ffff:ffff:ffff:ffff')).toBe('2001:db8:85a3:12::/64');
    expect(ipBucket('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(ipBucket('2001:0db8:0000:0012::9')).toBe('2001:db8:0:12::/64');
  });

  it('counts only failed sign-ins per account, and guards reset requests per account and address', () => {
    const signIn = AUTH_GUARDS['/sign-in/email']!;
    expect(signIn.failuresPerAccountAndIp).toBeDefined();
    expect(signIn.failuresPerAccount![0]).toBeGreaterThan(signIn.failuresPerAccountAndIp![0]);
    expect(AUTH_GUARDS['/request-password-reset']!.perAccountAndIp).toBeDefined();
    expect(AUTH_GUARDS['/send-verification-email']).toBeUndefined();
  });

  it('reads the account from a request body safely, and stores only real email addresses', () => {
    expect(accountOf({ email: '  Owner@Example.com ' })).toBe('owner@example.com');
    expect(accountOf({ email: 42 })).toBe('');
    expect(accountOf(null)).toBe('');
    expect(loggableEmail('owner@example.com')).toBe('owner@example.com');
    expect(loggableEmail('MySecretPassword1')).toBeNull();
    expect(loggableEmail('a b@example.com')).toBeNull();
  });

  it('honours test-only switches on localhost only', () => {
    expect(isLocalAppUrl('http://localhost:3100')).toBe(true);
    expect(isLocalAppUrl('http://127.0.0.1')).toBe(true);
    expect(isLocalAppUrl('https://app.dphoenixautocare.com')).toBe(false);
    expect(isLocalAppUrl('http://localhost.evil.example')).toBe(false);
    expect(limitScale('100', 'http://localhost:3100')).toBe(100);
    expect(limitScale('100', 'https://app.dphoenixautocare.com')).toBe(1);
    expect(limitScale(undefined, 'http://localhost:3000')).toBe(1);
    expect(limitScale('-5', 'http://localhost:3000')).toBe(1);
  });
});

describe('where to go after signing in', () => {
  it('stays on this site, whatever is typed', () => {
    expect(safeNext('/staff/abc?x=1')).toBe('/staff/abc?x=1');
    expect(safeNext(undefined)).toBe('/dashboard');
    for (const bad of ['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/%09/evil.com'.replace('%09', '\t'), 'https://evil.com', 'evil.com', '/\r//evil.com', '/ /x'.replace(' ', '\u0000')]) {
      const out = safeNext(bad);
      expect(out.startsWith('/') && !out.startsWith('//'), JSON.stringify(bad)).toBe(true);
      expect(new URL(out, 'https://app.example.com').origin).toBe('https://app.example.com');
    }
    expect(safeNext('/\t/evil.com')).toBe('/dashboard');
  });
});
