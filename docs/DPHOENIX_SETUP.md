# Setting up D'Phoenix Autocare (EJO 100 edition)

This guide takes you from an empty account to staff signing in and customers using their portal.
Do the steps in order. Nothing needs a terminal: every production deploy of the staff portal
prepares the database itself.

Values in `<angle brackets>` are yours to fill in. Secrets (passwords, keys) go **only** into the
Supabase and Vercel dashboards, never into GitHub, email or chat.

---

## What you will use

| What | Service | Why | Plan |
| --- | --- | --- | --- |
| Code | **GitHub** — `JusTech-Cxdxs/dphoenixautocare`, branch `main` | Vercel builds from it | Free |
| Database | **Supabase** (PostgreSQL) | Every record: customers, vehicles, job cards, payments | Free to start; **Pro** for real work (a Free project pauses after a week without use) |
| Hosting | **Vercel** — two projects from the one repository | The staff portal and the customer portal | Hobby to try; **Pro** for a business (Vercel's Hobby plan is for non-commercial use) |
| Email | Any SMTP mailbox (the Gmail account to start, a mailbox on your own domain later) | Welcome emails, password resets, estimates, receipts, reminders | — |
| AI (Enyo) | Any OpenAI-compatible model provider | Enyo, the assistant, for staff and customers | Optional; pay per use |
| Domain | `dphoenixautocare.com` (you have it) | Addresses such as `staff.dphoenixautocare.com` | — |

The two apps:

- **Staff portal** (`apps/portal`): front desk, workshop, managers, the MD/CEO, and you (IT control room, settings).
- **Customer portal** (`apps/website`): individual customers and company fleets follow their vehicles,
  jobs, estimates and payments. Its home page opens the customer sign-in; there is no public marketing
  site here (your current website stays where it is).

---

## 0. GitHub (once)

1. Open the repository → **Settings → General → Default branch** → choose `main`.
2. Delete the old branches `repo-init` and `phase-1-foundation` (Branches page) when you are happy.
3. **Settings → Code security**: turn on **Secret scanning** and **Push protection**.
4. **Settings → Rules → Rulesets** (or Branches → Branch protection): protect `main` (require a pull
   request before merging).

## 1. Supabase (the database)

1. Create a project named `dphoenixautocare`. **Region: Frankfurt (eu-central-1)**, to sit next to
   Vercel's `fra1`. Save the database password in your password manager.
2. Click **Connect** (top of the dashboard). You need two connection strings, both on the **pooler**
   host (Vercel cannot reach the "Direct connection" host):

   | Variable | Which string | Ends with |
   | --- | --- | --- |
   | `DATABASE_URL` | **Transaction pooler** (port 6543), then add `?pgbouncer=true&connection_limit=1` | `…pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
   | `DIRECT_URL` | **Session pooler** (port 5432) | `…pooler.supabase.com:5432/postgres` |

   Put your database password in place of `[YOUR-PASSWORD]`. If it contains `@ # / ? %`, replace
   them: `@`→`%40`, `#`→`%23`, `/`→`%2F`, `?`→`%3F`, `%`→`%25`.
3. **Project Settings → Database**: turn on **Enforce SSL**. On Pro, turn on daily backups (and
   Point-in-Time Recovery when you can). Turn on two-factor sign-in for your Supabase account.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key. They are for
   instant notifications (optional, recommended): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Nothing else to run now. The tables, the security rules, D'Phoenix Autocare, the Victoria Island
   workshop, the roles and your first sign-in are created by the first deploy (step 2).

## 2. Vercel — two projects from the one repository

**Add New → Project → Import** `JusTech-Cxdxs/dphoenixautocare` twice:

| | Staff portal | Customer portal |
| --- | --- | --- |
| Project name | `dphoenix-staff` | `dphoenix-customers` |
| **Root Directory** | `apps/portal` | `apps/website` |
| Build Command | leave as is (the app's `vercel.json` runs `npm run vercel:portal`) | leave as is (`npm run vercel:website`) |
| Framework / Install / Output | defaults | defaults |
| Node.js version | 24.x | 24.x |

Do **not** set `NODE_ENV`. Add the variables below **before** the first deploy (Project → Settings →
Environment Variables, environment **Production**; tick **Sensitive** for every secret). If Vercel
deployed once already without them, redeploy after adding them.

Making a random secret: any password manager can generate one (choose 64 characters, letters and
digits). On a computer: `openssl rand -base64 48`.

### 2.1 Staff portal (`dphoenix-staff`)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | transaction pooler string (step 1.2) |
| `DIRECT_URL` | session pooler string (step 1.2) |
| `BETTER_AUTH_SECRET` | a random secret — **the same value in both projects** |
| `BETTER_AUTH_URL` | the staff portal address, e.g. `https://dphoenix-staff.vercel.app` (later `https://staff.dphoenixautocare.com`) |
| `NEXT_PUBLIC_PORTAL_URL` | the same staff portal address |
| `NEXT_PUBLIC_WEBSITE_URL` | the customer portal address, e.g. `https://dphoenix-customers.vercel.app` |
| `NEXT_PUBLIC_ORGANISATION_NAME` | `D'Phoenix Autocare` |
| `MASTER_ADMIN_NAME` | your name as it should appear |
| `MASTER_ADMIN_EMAIL` | `<your email>` — your first sign-in (the platform administrator) |
| `MASTER_ADMIN_PASSWORD` | `<a long password>` — used once, when the account is created |
| `PLATFORM_OWNER_EMAIL` | `<your email>` — the platform owner (only the owner can change this account) |
| `CRON_SECRET` | a random secret (scheduled jobs) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | see step 5 |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | step 1.4 (optional, recommended) |
| `MAILBOX_ENCRYPTION_KEY` | a random secret of 32 bytes (`openssl rand -base64 32`) — only if you use Mail in the portal |
| `ENYO_LLM_BASE_URL`, `ENYO_LLM_API_KEY`, `ENYO_LLM_MODEL` | see step 6 (optional) |

Leave these **unset**: `DEMO_STAFF_PASSWORD` (the old demo), `RESET_MASTER_ADMIN_PASSWORD`,
`MAILBOX_ALLOW_INSECURE`, `NEXT_PUBLIC_DEALER_BRANDS`.

### 2.2 Customer portal (`dphoenix-customers`)

| Variable | Value |
| --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | the same two strings |
| `BETTER_AUTH_SECRET` | **the same value** as the staff portal |
| `NEXT_PUBLIC_WEBSITE_URL` | this project's address |
| `NEXT_PUBLIC_PORTAL_URL` | the staff portal address |
| `NEXT_PUBLIC_ORGANISATION_NAME` | `D'Phoenix Autocare` |
| `NEXT_PUBLIC_ORGANISATION_LEGAL_NAME` | `D'PHOENIX AUTOCARE LIMITED` |
| `NEXT_PUBLIC_SITE_TAGLINE` | `Restore Life To Your Vehicle` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `dphoenixautocare@gmail.com` |
| `NEXT_PUBLIC_CONTACT_PHONE` | `+234 811 496 6212` |
| `NEXT_PUBLIC_CONTACT_ADDRESS` | `Plot 1 Muri Okunola Street, Victoria Island, Lagos` |
| `SMTP_*` | the same as the staff portal |
| `WEBSITE_ORGANISATION_SLUG` | `dphoenix-autocare` (lets Enyo answer customers) |
| `ENYO_IP_HASH_KEY` | a random secret (only for rate limits) |
| `ENYO_LLM_BASE_URL`, `ENYO_LLM_API_KEY`, `ENYO_LLM_MODEL` | the same as the staff portal (optional) |

### 2.3 Deploy

1. Deploy the **staff portal** first. Its build log shows, in order: `[db-push]` (tables, security
   rules), `[seed]` (D'Phoenix Autocare, the workshop, roles, your sign-in), then the app build.
2. Deploy the **customer portal**.
3. If you added variables after a first deploy: Deployments → latest → **⋯ → Redeploy**.
4. **Remove `MASTER_ADMIN_PASSWORD`** from Vercel once you have signed in and changed your password
   (later deploys never change an existing password anyway).

### 2.4 Protect the previews

Each project → **Settings → Deployment Protection** → **Vercel Authentication**: on, **Standard
Protection**. Pull-request previews then need a Vercel login. Previews never change the database.

## 3. First sign-in and the settings to fill in

Open the staff portal, sign in with `MASTER_ADMIN_EMAIL` and the password, then change your password
(top right → your name → **Profile** → change password).

**Settings → Organisation profile** — this is your letterhead. Every printout, estimate PDF and email
header reads it:

- Already filled: name, legal name `D'PHOENIX AUTOCARE LIMITED`, address, both phone lines, email,
  website, logo and colours.
- Add: **RC number**, **PO Box** if any, and check every line.

**Settings → Organisation profile → Billing & tax** (below the details, **Edit Billing & Tax**) — how
estimates, invoices and receipts add up:

- **Charge VAT**: off until you switch it on. VAT is added after any discount.
- **VAT rate (%)**: preset to **7.5%**.
- **Tax ID (TIN) on invoices**: needed before VAT can be switched on; it prints beside the VAT line.
- **Discounts above this % need the Manager**: a discount on a whole estimate above this share of the
  customer's subtotal waits for the Manager, who approves it with the estimate. Leave it blank and
  every discount needs the Manager.

**Settings → Branches and departments → Victoria Island Workshop**: add the **bank name, account name
and account number** customers pay into. They print on estimates and payment requests.

**Service interval**: preset to every **5,000 km or 6 months**, whichever comes first. Change it on the
Service Tracker page if your workshop uses another interval (a single vehicle can have its own).

**Settings → Enyo**: switch Enyo on or off and see which model it uses (step 6).

**Settings → Users**: create each staff member with their **real work email** and the role that fits.
Each person receives a welcome email and sets their own password.

| Person | Role(s) | Sees |
| --- | --- | --- |
| MD / CEO | **Executive** (add **Manager** if they also approve estimates and close jobs) | Dashboard, Headquarters, Business Analytics, every job read-only, approvals if Manager |
| Workshop manager | **Manager** | Final approvals, closing and cancelling jobs, the workshop |
| Front desk | **Receptionist** (add **Finance Officer** if they take payments) | Customers, vehicles, opening Job Cards, bookings, payments |
| Supervisors | **Workshop Supervisor** | Accepting jobs, assigning technicians, estimates |
| Technicians | **Technician** | Their own jobs, inspections, work |
| Security | **Security Officer** / **Chief Security Officer** | Gate, visitors, exit passes |
| Customer care | **Customer Care** / **Customer Care Lead** | Support centre, complaints |
| You | Master Administrator (already) | Everything, the IT control room |

## 4. Scheduled jobs

- **Already scheduled on Vercel** (from `apps/portal/vercel.json`): the daily clean-ups at 08:00 Lagos
  time and the morning digest at 07:00 on weekdays.
- **Every few minutes** (appointment reminders, scheduled broadcasts, the support centre) runs from
  Supabase. After the staff portal is live, open Supabase → **SQL Editor** and run, in order:
  1. `scripts/v25-supabase-scheduler.sql` — first replace `PASTE_YOUR_CRON_SECRET_HERE` with your
     `CRON_SECRET` and `PASTE_YOUR_PORTAL_ADDRESS_HERE` with the staff portal address (no trailing `/`).
     The secret is stored encrypted in Supabase Vault.
  2. `scripts/v36-support-scheduler.sql` — replace the portal address (twice).
  3. After ten minutes, check: `select status_code, created from net._http_response order by created desc limit 5;`
     — `200` means working; `401` means the secret does not match Vercel's.
- **Service-due reminders** are sent by a person, by design: the **Service Tracker** lists every vehicle
  due or overdue, and one click sends the reminder by email. (WhatsApp links come in a later phase.)

If you change the staff portal address later (custom domain), run both scripts again with the new
address.

## 5. Email

Start with the existing Gmail account; move to a mailbox on `dphoenixautocare.com` later (customers
trust it more and the daily limits are higher).

**Gmail** (needs 2-Step Verification on the account):

1. Google Account → **Security → 2-Step Verification** → on.
2. Google Account → **Security → App passwords** → create one named `D'Phoenix portal`. Copy the
   16-letter password.
3. Set in **both** Vercel projects:

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `dphoenixautocare@gmail.com` |
| `SMTP_PASSWORD` | the app password (Sensitive) |
| `SMTP_FROM` | `D'Phoenix Autocare <dphoenixautocare@gmail.com>` |

Gmail sends only from its own address and allows about 500 emails a day. A domain mailbox (Google
Workspace or Zoho Mail) uses the same five variables with its own host.

## 6. Enyo, the AI assistant (optional)

Enyo works with **any OpenAI-compatible model server whose model supports tool calling**. Without these
variables Enyo shows "not switched on yet" and everything else works as normal. Set the same values in
**both** projects:

| Variable | Value |
| --- | --- |
| `ENYO_LLM_BASE_URL` | the provider's OpenAI-compatible address |
| `ENYO_LLM_API_KEY` | your key (Sensitive) |
| `ENYO_LLM_MODEL` | a model name from the provider's list that supports tool calling |
| `ENYO_LLM_FAST_MODEL` | optional: a smaller model for briefs |
| `ENYO_LLM_PROVIDER_LABEL` | optional: the name shown on Settings → Enyo |

Choices:

- **OpenAI** — `https://api.openai.com/v1`. Paid per use; their API terms say API data is not used for
  training. Good for real customer records.
- **Groq** — `https://api.groq.com/openai/v1`. A free tier for trying Enyo out; read their data terms
  before using it with real customer records.
- **Your own server** (e.g. Ollama) — keeps everything in-house; needs a machine with a strong GPU.

Enyo only reads what the signed-in person may see, every answer links the record it came from, and the
key never reaches a browser. Settings → Enyo shows the provider and lets you switch Enyo off.

## 7. Your domain (recommended)

1. Staff portal project → **Settings → Domains** → add `staff.dphoenixautocare.com`. Customer portal →
   add `my.dphoenixautocare.com`. Add the DNS records Vercel shows at your domain registrar.
2. Update `BETTER_AUTH_URL`, `NEXT_PUBLIC_PORTAL_URL` and `NEXT_PUBLIC_WEBSITE_URL` in **both** projects
   to the new addresses. Put the old `vercel.app` addresses in `BETTER_AUTH_TRUSTED_ORIGINS` while you
   move. Redeploy both.
3. Run the two scheduler scripts again with the new staff address (step 4).
4. On your public website, link **"Customer portal"** to `https://my.dphoenixautocare.com`.

## 8. Branding — what is already done

| Where | What |
| --- | --- |
| Sign-in pages, menus, dashboards | The D'Phoenix logo, navy `#0A1628`, orange `#F09E2C`, gold `#D6890B`; text on orange is navy so it stays readable; light and dark mode |
| "Powered by EJO 100" | At the foot of every page and email |
| Enyo | Dressed in D'Phoenix navy with orange trim and a gold chain |
| App icon | The logo on the phone home screen and browser tab (navy background when installed) |
| Emails | D'Phoenix header, colours and logo; orange buttons with navy text |
| Printouts (Job Card, estimate, inspection, invoice, receipt, refund, exit pass) | Letterhead with the logo, name, address, phones, email and RC number from **Settings → Organisation profile**; gold rules; ₦ amounts |
| Invoices | Issued by themselves when a Job Card is marked **Completed** (`INV-2026-000001`), emailed to the customer with a PDF, and shown on the Job Card (Print, Email) and in the customer portal; discounts, VAT with the rate and your TIN, amount paid, balance due and the branch's bank details; "Thank you for choosing D'Phoenix Autocare" at the foot |
| Receipts | Every payment gets its own number (`RCT-2026-000001`), in the payment email, on the Job Card's payments list (Print receipt) and in the customer portal. Payments recorded before receipts existed show "—" |
| Estimate, invoice and inspection PDFs (email attachments) | The same letterhead and colours; the ₦ sign prints, through the embedded Noto Sans font |

## 9. Before real customers

- [ ] `main` is the default branch and protected (step 0)
- [ ] Supabase: SSL enforced, backups on, two-factor sign-in (step 1)
- [ ] Vercel: previews protected (step 2.4); `MASTER_ADMIN_PASSWORD` removed after first sign-in
- [ ] Organisation profile and bank details checked (step 3)
- [ ] A test customer: open a Job Card, approve the estimate, take a payment, check out, then sign in
      to the customer portal as that customer; delete the test records after (they go to the Recycle bin)
- [ ] Emails arrive (welcome, password reset, estimate)
- [ ] Settings → System health shows the scheduled jobs running

## 10. When something goes wrong

| What you see | What to do |
| --- | --- |
| Build log: `[seed] Skipping — set MASTER_ADMIN_EMAIL…` | Add the two variables and redeploy the staff portal |
| Build log: `prepared statement … already exists` | `DATABASE_URL` must be the **transaction** pooler with `?pgbouncer=true&connection_limit=1`; `DIRECT_URL` the **session** pooler |
| Build stops with "Missing NEXT_PUBLIC_…" | Add the address variables (step 2) and redeploy |
| Sign-in says the request is not allowed | The address you use is not `BETTER_AUTH_URL`; add it to `BETTER_AUTH_TRUSTED_ORIGINS` |
| Customers cannot sign in on the customer portal | `BETTER_AUTH_SECRET` differs between the two projects |
| No emails | Check the `SMTP_*` values; for Gmail the password must be an app password |
| Enyo says "not switched on yet" | `ENYO_LLM_*` missing in that project; redeploy after adding |
| Scheduler shows `401` | The secret in Supabase Vault differs from Vercel's `CRON_SECRET`; run v25 again with the right one |
| Something broke after a deploy | Vercel → Deployments → the last good one → **⋯ → Instant Rollback**. Database changes are additive only, so older code keeps working |

More detail on each setting: [OPERATIONS_CHECKLIST.md](OPERATIONS_CHECKLIST.md) (security headers,
firewall, spend limits), [FREE_PLAN.md](FREE_PLAN.md) (staying within free limits),
[ROLES_AND_ACCESS.md](ROLES_AND_ACCESS.md) (every role and permission).
