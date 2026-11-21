import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';

/**
 * Real-database tests (TEST_DATABASE_URL, reset to the migrations plus the
 * post-deploy SQL by tests/support/global-setup.ts). Skipped without it.
 */
const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d('database protections', () => {
  let client: pg.Client;
  beforeAll(async () => {
    client = new pg.Client({ connectionString: url });
    await client.connect();
  });
  afterAll(async () => client?.end());

  it('has row-level security on every table', async () => {
    const r = await client.query(`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`);
    expect(r.rows).toEqual([]);
  });

  it('gives Supabase public roles no access to any table or function', async () => {
    for (const role of ['anon', 'authenticated']) {
      const exists = await client.query('select 1 from pg_roles where rolname = $1', [role]);
      if (!exists.rowCount) continue;
      const t = await client.query(
        `select table_name from information_schema.role_table_grants where grantee = $1 and table_schema = 'public'`,
        [role],
      );
      expect(t.rows, role).toEqual([]);
      const f = await client.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege($1, p.oid, 'execute')`, [role]);
      expect(f.rows, role).toEqual([]);
    }
  });

  it('refuses to change or delete audit entries', async () => {
    await client.query(`insert into audit_logs (action, "entityType") values ('test.append_only', 'Test')`);
    await expect(client.query(`update audit_logs set action = 'x' where action = 'test.append_only'`)).rejects.toThrow(/append-only/);
    await expect(client.query(`delete from audit_logs where action = 'test.append_only'`)).rejects.toThrow(/append-only/);
    await expect(client.query(`truncate audit_logs`)).rejects.toThrow(/append-only/);
  });

  it('keeps exactly one settings row with sane values', async () => {
    const r = await client.query('select count(*)::int as n from settings');
    expect(r.rows[0].n).toBe(1);
    await expect(client.query(`insert into settings (id, "updatedAt") values (2, now())`)).rejects.toThrow();
    await expect(client.query(`update settings set "vatRatePercent" = 150 where id = 1`)).rejects.toThrow(/settings_percentages/);
    await expect(client.query(`update settings set "depositPercent" = 0 where id = 1`)).rejects.toThrow(/settings_percentages/);
  });

  it('stores emails in lower case only', async () => {
    await expect(client.query(`insert into users (id, name, email, "updatedAt") values ('t-upper', 'T', 'Someone@Example.com', now())`)).rejects.toThrow(/users_email_lower/);
  });

  it('has the five roles from the reference-data migration', async () => {
    const r = await client.query('select key from roles order by key');
    expect(r.rows.map((x) => x.key)).toEqual(['FRONT_DESK', 'OWNER', 'SECURITY', 'SUPERVISOR', 'TECHNICIAN']);
  });
});

d('rate limits', () => {
  it('counts across calls and fails closed only when asked', async () => {
    const { rateLimit } = await import('@/lib/security/rate-limit');
    const key = `test:${Date.now()}`;
    expect(await rateLimit(key, 2, 60_000)).toBe(true);
    expect(await rateLimit(key, 2, 60_000)).toBe(true);
    expect(await rateLimit(key, 2, 60_000)).toBe(false);
    // A short window starts again.
    const short = `short:${Date.now()}`;
    expect(await rateLimit(short, 1, 1000)).toBe(true);
    expect(await rateLimit(short, 1, 1000)).toBe(false);
    await new Promise((r) => setTimeout(r, 1100));
    expect(await rateLimit(short, 1, 1000)).toBe(true);
  });
});

d('sign-in guard', () => {
  it('stops password guessing after ten failures from one address, with one message for everyone', async () => {
    const { guardAuthAttempt, recordFailedAttempt } = await import('@/lib/security/rate-limit');
    const h = new Headers();
    const body = { email: `guess-${Date.now()}@example.com` };
    for (let i = 0; i < 10; i++) {
      expect((await guardAuthAttempt('/sign-in/email', body, h)).ok).toBe(true);
      await recordFailedAttempt('/sign-in/email', body.email, h);
    }
    const refused = await guardAuthAttempt('/sign-in/email', body, h);
    expect(refused).toEqual({ ok: false, code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes, then try again.' });
    // Other people at the same address can still sign in.
    expect((await guardAuthAttempt('/sign-in/email', { email: `other-${Date.now()}@example.com` }, h)).ok).toBe(true);
    // Paths without a rule are not limited.
    expect((await guardAuthAttempt('/get-session', body, h)).ok).toBe(true);
  });

  it('never locks a person out for signing in correctly, however often', async () => {
    const { guardAuthAttempt } = await import('@/lib/security/rate-limit');
    const h = new Headers();
    const body = { email: `busy-${Date.now()}@example.com` };
    for (let i = 0; i < 25; i++) expect((await guardAuthAttempt('/sign-in/email', body, h)).ok).toBe(true);
  });
});

d('data journal', () => {
  it('records who changed what, before and after', async () => {
    const { prisma } = await import('@/lib/db');
    const { setAuditActor } = await import('@/lib/audit/journal');
    setAuditActor('user-journal-test', 'test');
    const s = await prisma.staff.create({ data: { name: 'Journal Test', roleTitle: 'Technician' } });
    await prisma.staff.update({ where: { id: s.id }, data: { roleTitle: 'Senior Technician' } });
    const rows = await prisma.auditLog.findMany({ where: { entityType: 'db:Staff', entityId: s.id }, orderBy: { id: 'asc' } });
    expect(rows.map((r) => r.action)).toEqual(['data.create', 'data.update']);
    expect(rows.every((r) => r.userId === 'user-journal-test' && r.source === 'test')).toBe(true);
    expect(rows[1]!.metadata).toMatchObject({ before: { roleTitle: 'Technician' }, after: { roleTitle: 'Senior Technician' } });
  });

  it('keeps entries for committed transactions and drops them on rollback', async () => {
    const { prisma } = await import('@/lib/db');
    const ok = await prisma.$transaction(async (tx) => tx.staff.create({ data: { name: 'Committed', roleTitle: 'Front Desk' } }));
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.staff.create({ data: { name: 'Rolled Back', roleTitle: 'Front Desk' } });
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');
    await prisma.staff.count(); // any ordinary query flushes held entries
    const committed = await prisma.auditLog.count({ where: { entityType: 'db:Staff', entityId: ok.id } });
    expect(committed).toBe(1);
    const all = await prisma.auditLog.findMany({ where: { entityType: 'db:Staff', action: 'data.create' } });
    expect(JSON.stringify(all.map((a) => a.metadata))).not.toContain('Rolled Back');
  });

  it('never journals sign-in internals and redacts secrets', async () => {
    const { prisma } = await import('@/lib/db');
    const { redact } = await import('@/lib/audit/journal');
    await prisma.verification.create({ data: { identifier: 'reset-password:abc', value: 'x', expiresAt: new Date(Date.now() + 60_000) } });
    expect(await prisma.auditLog.count({ where: { entityType: 'db:Verification' } })).toBe(0);
    expect(redact({ password: 'p', nested: { apiToken: 't', ok: 1 }, link: 'reset-password:abc' })).toEqual({ password: '[redacted]', nested: { apiToken: '[redacted]', ok: 1 }, link: '[redacted]' });
  });
});
