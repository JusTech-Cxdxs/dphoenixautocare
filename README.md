# D'Phoenix Autocare: Workshop and Fleet System

An EJO edition by JusTech for D'PHOENIX AUTOCARE LIMITED, Victoria Island, Lagos.
One system for the front desk, job cards, estimates, invoices, payments, fleet
service schedules, the gate, appointments, support and a customer portal.

> Status: **phase 1 of 11, the foundation.** Sign-in, roles and permissions,
> the branded app shell, settings, staff and logins, and the audit log. Later
> phases add customers and vehicles, job cards, money, fleet, the gate,
> appointments, the portal, messages, dashboards and imports.

## What is in this phase

| Area | What it does |
|---|---|
| Sign-in | Email and password, forgot and reset password, email confirmation, invitations for new staff. Sessions live in the database with HTTP-only cookies. |
| Roles | Owner, Front Desk, Supervisor, Technician, Security. Optional roles only work while their module is switched on. |
| Permissions | Defined in code (`lib/authz/catalogue.ts`), checked on the server by every page and action. The Owner can add extra grants; Owner-only permissions cannot be given away. |
| Staff and logins | Everyone who works in the workshop, with or without a login. The Owner adds, edits, switches off and invites. |
| Settings | Business details, VAT, discount limit, deposit rule, document prefixes, optional modules and service-reminder defaults. |
| Audit log | Every change, sign-in, failed sign-in and refused attempt, append-only in the database. |

## How it is built

One Next.js app. A monorepo would add packages, build steps and version
juggling for no gain: there is one deployable, one database and one team. Staff
pages live in `app/(staff)`, sign-in pages in `app/(auth)`, and the customer
portal will live in `app/portal`.

| Part | Choice |
|---|---|
| Runtime | Node.js 24, TypeScript 5.9 (strict) |
| Web | Next.js 15.5 App Router, React 19, server actions, Tailwind CSS 4, Geist font |
| Sign-in | Better Auth 1.7 |
| Database | PostgreSQL 16 through Prisma 5.22, Supabase in production, versioned migrations |
| Email | nodemailer over SMTP |
| Tests | Vitest (logic and database), Playwright (browser), axe (accessibility), a load and failover test |
| Hosting | Vercel (app) and Supabase (database, live updates, files) |

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Running it on your computer

You need Node.js 24 and PostgreSQL 16.

```bash
npm ci
```

```bash
cp .env.example .env
```

Fill in `.env`: at least `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`
(a long random string), `BETTER_AUTH_URL=http://localhost:3000`,
`OWNER_EMAIL` and `OWNER_PASSWORD`. Without SMTP settings, `npm run dev` saves
emails in `.mail-outbox/` so you can open the links.

```bash
npm run db:deploy && npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000 and sign in as the Owner.

## Checks

| Command | What it runs |
|---|---|
| `npm run lint` | ESLint, no warnings allowed |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests, plus database tests when `TEST_DATABASE_URL` is set |
| `npm run db:check` | Database changes are additive and match the schema |
| `npm run build && npm run e2e` | Browser tests on desktop and phone (needs `E2E_DATABASE_URL` and `E2E_PASSWORD`) |
| `npm run load` | Load test against a running build |

Every pull request runs all of them in GitHub Actions, plus secret scanning,
static analysis, a dependency audit and an OWASP ZAP scan.

## Environment variables

Names only; see `.env.example`. Secrets are never committed.

`DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`OWNER_EMAIL`, `OWNER_NAME`, `OWNER_PASSWORD`, `RATE_LIMIT_SALT`,
`PRISMA_CONNECTION_LIMIT`, `PRISMA_POOL_TIMEOUT`, `TRUST_CLOUDFLARE`,
`TRUSTED_PROXY`. Test-only (ignored unless the app runs on localhost):
`MAIL_OUTBOX`, `AUTH_ATTEMPT_LIMIT_SCALE`.

## Ownership

Built and owned by JusTech (Just Technologies), Lagos. Powered by EJO · JusTech.
