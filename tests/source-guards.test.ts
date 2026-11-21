import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Source scans (EJO's guard-coverage idea): permission checks are easy to
 * forget, so these tests read the code and fail the build when one is missing.
 */
const ROOT = process.cwd();

function files(dir: string, test: (f: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p, test));
    else if (test(p)) out.push(p);
  }
  return out;
}

const appFiles = files(join(ROOT, 'app'), (f) => /\.(ts|tsx)$/.test(f));
const rel = (f: string) => relative(ROOT, f);

/** Splits a 'use server' file into its exported async functions and their bodies. */
function exportedActions(src: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /export\s+async\s+function\s+(\w+)\s*\(/g;
  let m: RegExpExecArray | null;
  const starts: { name: string; index: number }[] = [];
  while ((m = re.exec(src))) starts.push({ name: m[1]!, index: m.index });
  starts.forEach((s, i) => out.push({ name: s.name, body: src.slice(s.index, starts[i + 1]?.index ?? src.length) }));
  return out;
}

describe('server actions', () => {
  const actionFiles = appFiles.filter((f) => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf8')));

  it('exist (the scan is looking in the right place)', () => {
    expect(actionFiles.length).toBeGreaterThan(0);
  });

  it.each(actionFiles.map(rel))('%s: every exported action checks permission first', (file) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    // Nothing but async functions may be exported from a 'use server' file.
    expect(src).not.toMatch(/export\s+(const|let|var|class|default)\b/);
    for (const a of exportedActions(src)) {
      const guard = a.body.search(/\bauthorize\(/);
      expect(guard, `${file} ${a.name} must call authorize()`).toBeGreaterThan(-1);
      const firstDb = a.body.search(/\bprisma\.|\btx\./);
      if (firstDb > -1) expect(guard, `${file} ${a.name} touches the database before authorize()`).toBeLessThan(firstDb);
    }
  });
});

describe('staff pages', () => {
  const OPEN_TO_ANY_SIGNED_IN = new Set(['app/(staff)/access-denied/page.tsx']);
  const pages = appFiles.filter((f) => rel(f).startsWith('app/(staff)/') && f.endsWith('page.tsx'));

  it.each(pages.map(rel))('%s guards itself on the server', (file) => {
    if (OPEN_TO_ANY_SIGNED_IN.has(file)) return;
    expect(readFileSync(join(ROOT, file), 'utf8')).toMatch(/\bguardPage\(/);
  });

  it('sit behind the signed-in layout', () => {
    expect(readFileSync(join(ROOT, 'app/(staff)/layout.tsx'), 'utf8')).toMatch(/requireUser\(\)/);
  });
});

describe('API routes', () => {
  // Each public route says why it is public.
  const PUBLIC: Record<string, string> = {
    'app/api/auth/[...all]/route.ts': 'Better Auth: sign-in, reset and verification, rate-limited in lib/auth/auth.ts',
    'app/api/health/route.ts': 'Uptime check: answers ok/down only',
  };
  const routes = appFiles.filter((f) => rel(f).startsWith('app/api/') && f.endsWith('route.ts'));

  it.each(routes.map(rel))('%s checks who is calling', (file) => {
    if (PUBLIC[file]) return;
    expect(readFileSync(join(ROOT, file), 'utf8')).toMatch(/\b(getCurrentUser|requireUser|authorize)\(/);
  });
});

describe('client code', () => {
  it('never imports server-only modules or secrets', () => {
    const client = files(ROOT, (f) => !f.includes('node_modules') && !f.includes('.next') && /\.(tsx?|jsx?)$/.test(f) && /^\s*['"]use client['"]/.test(readFileSync(f, 'utf8')));
    for (const f of client) {
      const src = readFileSync(f, 'utf8');
      expect(src, rel(f)).not.toMatch(/from ['"]@\/lib\/(db|auth\/auth|auth\/session|authz\/server|settings|security\/rate-limit|email\/mailer)['"]/);
      expect(src, rel(f)).not.toMatch(/process\.env\.(?!NEXT_PUBLIC_)\w+/);
    }
  });

  it('never renders raw HTML or runs raw SQL from strings', () => {
    const all = files(ROOT, (f) => !f.includes('node_modules') && !f.includes('.next') && !f.includes('/tests/') && /\.(tsx?)$/.test(f));
    for (const f of all) {
      const src = readFileSync(f, 'utf8');
      expect(src, rel(f)).not.toMatch(/dangerouslySetInnerHTML/);
      expect(src, rel(f)).not.toMatch(/\$(queryRawUnsafe|executeRawUnsafe)\b/);
    }
  });
});
