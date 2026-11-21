# Architecture

How the system is put together, why, and how it grows with more users.

## Request path

1. **Middleware** (`middleware.ts`, edge): gives every request an id
   (`x-request-id`) and every page a Content-Security-Policy with a fresh
   nonce. Sends people without a session cookie to sign-in. This is a quick
   routing check only; it never decides access.
2. **Session** (`lib/auth/session.ts`): Better Auth reads the session row from
   the database on every request (no cookie cache), so switching an account
   off or resetting a password takes effect on the next click.
3. **Permission** (`lib/authz/server.ts`): every page calls `guardPage`, and
   every server action calls `authorize` before it reads or writes. Both use
   the one pure rule in `lib/authz/catalogue.ts`. Refusals are audited.
4. **Write**: inside a transaction where more than one row changes, with a
   business audit entry written in the same transaction (`lib/audit/log.ts`).
   Business entries carry what changed, before and after (for example a VAT
   rate from 7.5 to 10). The data journal (`lib/audit/journal.ts`) also records
   every row written, attributed to the person; outside a transaction it keeps
   the values before as well.
5. **After the response**: a "something changed" ping goes to Supabase
   Realtime. Open pages fetch `/api/live/pulse` and refresh only if something
   actually changed. Without Realtime they check every 20 seconds.

## Data rules

- **Migrations** (`prisma/migrations`) are reviewed SQL. Changes are additive
  once merged; `scripts/check-migrations.mjs` fails CI on destructive SQL, on
  edits to merged migrations, and on schema drift.
- **Reference data** (the five roles, the settings row) comes from a
  migration, so every environment has it without a seed script.
- **After every deploy** `scripts/postdeploy/*.sql` turns on row-level
  security with no policies on every table, removes all rights from Supabase's
  public roles, and makes `audit_logs` append-only with a trigger.
- **Database guards** back up the app's own checks: one settings row,
  percentages between 0 and 100, positive intervals, lower-case emails.
- **Inventory**: `tests/data-inventory.test.ts` lists every table and its
  purpose. A table nobody accounted for fails the build.

## Security in layers

| Layer | Control |
|---|---|
| Browser | Strict CSP with nonces, HSTS, no framing, no sniffing, features like camera and microphone switched off |
| Sign-in | No public sign-up; invitations only. Passwords 10+ characters with common-guess checks. Hashed one-time link tokens. Database-backed limits shared across all servers: per address (IPv6 per /64), and per account counting only failed attempts, so nobody can lock a person out. Same answer for known and unknown emails. Confirmation links never sign anyone in by themselves. |
| Access | Permission check on the server in every page, action and route; source-scan tests fail the build when one is missing |
| Data | Row-level security default deny; append-only audit log; secrets redacted from the journal |
| Supply chain | Pinned versions, `npm audit` in CI, gitleaks over the whole history, Semgrep rules, weekly Dependabot updates |
| Operations | Error references people can quote; structured JSON logs; `/api/health` for uptime checks |

## Scaling with more users and more load

The app is stateless: everything that must be shared lives in PostgreSQL
(sessions and rate limits), so any number of server instances can run side by
side. The settings row is cached with Next.js's data cache and refreshed the
moment the Owner saves; on Vercel that refresh reaches every instance, and a
self-hosted instance picks the change up within five minutes at most.

| Load | What carries it |
|---|---|
| Many people at once | Vercel runs more instances automatically and balances between them. Nothing is kept in one instance's memory that another needs. |
| Many database connections | Each instance keeps a small Prisma pool (`PRISMA_CONNECTION_LIMIT`, default 5); Supabase's pooler (PgBouncer, port 6543) shares connections between instances. Migrations use the direct connection. |
| Frequent reads | Settings are cached across requests and refreshed the moment they change. The live pulse is one indexed query, shared by all pages on an instance for 3 seconds. |
| Big tables | Lists page through with an index (the audit log uses its primary key as the cursor) instead of counting or offsetting. Indexes match the filters used. |
| Spikes | Measured on one instance in a small test container (quick profile): 80 concurrent users, about 140 requests a second, p95 under 900 ms, no errors. CI repeats this on every pull request. |
| An instance dying | Measured in the failover test: two instances behind a load balancer, one killed mid-run. No request failed, and signed-in people stayed signed in, because sessions live in the database. |

When the measured numbers say so, the next steps are: a read replica for
dashboards and reports, Redis for rate limits and the pulse, a queue for email
and PDF work, and Cloudflare in front for a web application firewall. None of
these are needed for one workshop today, and the code does not depend on their
absence.

## Testing

| Suite | What it proves |
|---|---|
| Unit (`tests/*.test.ts`) | Permission rules, formats (DD/MM/YYYY, Africa/Lagos, 234 phones), protection logic, email escaping, CSP, audit filters |
| Database (`tests/database.test.ts`) | Row-level security on every table, no public rights, append-only audit log, check constraints, shared rate limits, journal attribution and rollback behaviour |
| Source scans (`tests/source-guards.test.ts`) | Every server action, page and route checks permission; no raw HTML; no raw SQL strings; no server modules in browser code |
| Browser (`e2e/*.spec.ts`) | Sign-in and reset, invitations, every role against every page, switching accounts and modules off, security headers, phone layout, accessibility (axe, WCAG 2.1 AA) |
| Load and failover (`scripts/load-test.ts`) | Staged users (smoke, baseline, ramp, spike, recovery) and one instance killed mid-run; fails above 1% errors |
