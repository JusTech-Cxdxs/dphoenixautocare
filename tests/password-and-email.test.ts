import { describe, expect, it } from 'vitest';
import { passwordHint, PASSWORD_MIN } from '@/lib/auth/password-rules';
import { esc, renderEmail } from '@/lib/email/layout';
import { contentSecurityPolicy } from '@/lib/security/headers';

const business = { displayName: "D'Phoenix Autocare", tagline: 'Restore Life To Your Vehicle', phones: ['+234 811 496 6212'], email: 'dphoenixautocare@gmail.com', address: 'Plot 1 Muri Okunola Street', website: 'https://www.dphoenixautocare.com' };

describe('passwords', () => {
  it('needs length, and refuses easy guesses', () => {
    expect(passwordHint('short').ok).toBe(false);
    expect(passwordHint('a'.repeat(PASSWORD_MIN)).ok).toBe(false);
    expect(passwordHint('password12345').ok).toBe(false);
    expect(passwordHint('dphoenix workshop').ok).toBe(false);
    expect(passwordHint('blue taxi on third mainland').ok).toBe(true);
    expect(passwordHint('x'.repeat(200)).ok).toBe(false);
  });
});

describe('emails', () => {
  it('escapes everything placed in them', () => {
    expect(esc(`<script>"x"&'y'</script>`)).toBe('&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;');
    const m = renderEmail(business, { previewText: 'p', heading: '<b>Hi</b>', paragraphs: ['<img src=x onerror=alert(1)>'], button: { label: 'Go', url: 'https://example.com/?a="b"' } });
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).not.toContain('<b>Hi</b>');
    expect(m.html).toContain('Powered by EJO · JusTech');
    expect(m.text).toContain('Go: https://example.com/?a="b"');
  });
});

describe('content security policy', () => {
  it('allows only nonce scripts in production', () => {
    const env = process.env as Record<string, string | undefined>;
    const before = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      const csp = contentSecurityPolicy('abc123', 'https://xyz.supabase.co');
      expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
      expect(csp).not.toContain('unsafe-eval');
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain('wss://xyz.supabase.co');
    } finally {
      env.NODE_ENV = before;
    }
  });
});
