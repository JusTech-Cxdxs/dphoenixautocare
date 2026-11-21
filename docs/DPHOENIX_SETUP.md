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
| AI (Enyo) | **Anthropic** (Claude), from the Anthropic Console | Enyo, the assistant, for staff and customers | Optional; pay per use (set a monthly spend limit) |
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
| `ENYO_LLM_PROVIDER`, `ENYO_LLM_API_KEY`, `ENYO_LLM_MODEL`, `ENYO_LLM_FAST_MODEL`, `ENYO_LLM_PROVIDER_LABEL` | see step 6 (optional) |

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
| `ENYO_LLM_PROVIDER`, `ENYO_LLM_API_KEY`, `ENYO_LLM_MODEL`, `ENYO_LLM_FAST_MODEL`, `ENYO_LLM_PROVIDER_LABEL` | the same as the staff portal (optional, step 6) |

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
- **Require a deposit before work starts (individual customers only)**: off until you switch it on.
  Off, the customer's approval alone starts the work. On, an individual customer also pays
  **Deposit (%)** of the estimate first (preset to 70%). Organisations (company and fleet customers)
  never pay a deposit.

**How customers approve an estimate.** When the front desk presses **Notify customer**, the customer
is emailed the estimate with a secure **Approve or decline online** link (it works once, for 7 days).
They can also approve or decline on their Job Card in the customer portal, or tell you by phone: on
the Job Card, **Customer approved by phone** records who you spoke with and your name. **Send approval
link** emails a fresh link and offers **Share on WhatsApp**, which opens WhatsApp on your phone with
the message ready to send. Paying the deposit at the counter still counts as approval. The Job Card
moves to In Progress once the customer has approved and any deposit is paid. A decline shows on the
Job Card with the customer's note, so the front desk can call them.

**Putting a company on credit.** Open the customer in **Customers** (it must be an **Organisation**
with its company name filled in). Finance or the Manager uses **On account → Put on credit**: the
**payment terms (days)**, for example 30, and an optional **credit limit (₦)**. On credit, its Job
Cards need no deposit and can be closed and checked out with a balance: the invoice is issued and
reads **Payment due by** the date its terms give. If the company's unpaid invoices would go over the
limit, only the Manager can close the Job Card, by ticking **Close over the credit limit**. The same
card shows what the company owes now and what is overdue, with links to the invoices. Record its
payments on the Job Card as usual until the invoice is paid.

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

### Bringing in your Zoho and Excel records

Your customers, vehicles, past invoices, past job cards and staff come in through **Data Exchange →
New import** (Organisation Administrator or IT Administrator; a Manager or the Customer Care Lead
approves, as the screen says). Each file is checked first — nothing is saved until you approve — and
can be undone in one click afterwards.

1. **Export from Zoho.** Zoho Books or Zoho Invoice: **Sales → Customers → Export** (choose CSV or
   XLSX) and **Sales → Invoices → Export** (one row per item is fine). Zoho CRM: **Contacts** or
   **Accounts → Export**. Zoho People: the employee list. Your own spreadsheets (the vehicles register,
   old job cards) work as they are: save them as `.xlsx` or `.csv`.
2. **Load them in this order:** staff → customers → vehicles → invoices → past job cards. A vehicle
   finds its owner, and an invoice its customer, by the customer number (Zoho's **Contact ID** /
   **Customer ID**), the phone, or — for an invoice — the customer's name when exactly one customer has
   it.
3. **The columns map themselves.** Zoho's own headers are recognised — *Display Name*, *Company
   Name*, *First Name*, *Last Name*, *EmailID*, *Phone*, *Mobile Phone*, *Billing Address / City /
   State*, *Customer Sub Type* (business or individual), *Payment Terms*, *Account Name*, *Mailing
   Street*; and for invoices *Invoice Number*, *Invoice Date*, *Due Date*, *Customer ID*, *Customer
   Name*, *Total*, *Balance*, *Invoice Status*, *Item Name*, *Quantity*, *Item Price*. Check the
   mapping screen, change any column it got wrong, and save the mapping for next time.
4. **What happens to Zoho's extras.** *Payment Terms* ("Net 30") is kept as a tag on the customer:
   credit itself is set in EJO by Finance or the Manager (see *Putting a company on credit* above).
   An invoice's balance, due date and status are kept with it; a **Void** or **Draft** invoice is
   reported and not loaded. Past invoices are read-only history: they count in each customer's spend
   and the figures, but are not invoices EJO issued.
5. **Getting records out to Excel.** Every main list has an **Export** button (Excel or CSV, exactly as
   the list is filtered): **Customers**, **Vehicles**, **Job Cards**, and **Export invoices** on the
   Job Cards page (every invoice with its VAT, what has been paid, the balance, and a *Status* column —
   Paid, Owing or Overdue — to filter on in Excel). Exports are listed under **Data Exchange →
   Exports**; an exported customers or vehicles file can be edited in Excel and brought back in to
   update those records.

To show the portal to someone without touching real customers, use the demo: it lives in its own
organisation, *D'Phoenix Autocare (Demo)* — see `docs/DPHOENIX_DEMO.md`.

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
- **Service-due reminders** are sent by a person, by design: the **Service Tracker** (and each
  vehicle's page) lists every vehicle due or overdue, with two ways to remind the customer:
  - **Send reminder** emails it (customers with an email address), on the staged schedule the
    tracker shows (1st, 2nd, 3rd, then overdue, seven working days apart).
  - **Send on WhatsApp** opens WhatsApp on your own phone or computer with the message already
    written — the vehicle, its plate, the kilometres and date it is due, and the workshop's number to
    call back. You press send yourself: the portal sends nothing, so there is nothing to set up and
    no WhatsApp account to connect. The button only shows when the customer's phone can take
    WhatsApp (a Nigerian mobile such as 0803 123 4567, or a number written with + and its country
    code). The number used is the branch's first hotline (Settings → Branches), else the
    organisation's.
- The same **Send on WhatsApp** sits next to the other messages to a customer: *Ready for
  collection* on the Job Card, the **invoice** (its number, the total and the balance, and the link
  to it in the customer portal) and each **payment receipt**.

If you change the staff portal address later (custom domain), run both scripts again with the new
address.

### WhatsApp

Wherever the portal emails a customer because someone pressed a button, a **Send on WhatsApp** button
sits beside it with the same message, written for WhatsApp. Nothing is ever sent by WhatsApp
automatically: you press **Send on WhatsApp**, then **Open WhatsApp**, and WhatsApp opens on your
own phone or computer with the message ready; you press send. The button only shows when the
customer's phone can take WhatsApp (see above). Each message is recorded on the Job Card or the
customer's activity, without the links in it.

| Where | Button | What the message carries |
| --- | --- | --- |
| Job Card, waiting for the customer's approval (also **Vehicles in custody**) | **Send estimate on WhatsApp** | The total, any deposit, the **estimate PDF** and a fresh **approval link**. The new approval link replaces the one in the email: only the newest works |
| Job Card → Invoice | **Send on WhatsApp** | The invoice number, total, balance and due date, the **invoice PDF** and the customer-portal link |
| Job Card → Payments | **Receipt on WhatsApp** (Finance) | The amount, date, receipt number and balance after it, and the **receipt PDF** |
| Job Card → Refunds | **Refund on WhatsApp** (Finance) | The amount, method and refund number (there is no refund PDF; print the customer copy) |
| Job Card (Contact) | The notice for where the Job Card is: *Checked in*, *Work started*, *Quality check*, *Completed*, *Ready for collection*, *Collected*, *Cancelled*, *Closed* | The same notice as the email |
| Vehicles in custody | *Collection reminder* / *Collection notice on WhatsApp* | The same reminder as the email |
| Service Tracker and each vehicle | **Send on WhatsApp** | The service reminder |
| Customers → Support centre → a request | *This reply on WhatsApp* (under your last reply) | Your reply, with the request number |
| A new customer (Customers → Register, or the front desk) and the customer's **Customer portal** card | **Send the welcome on WhatsApp** / **Send on WhatsApp** | The welcome, the customer portal's address and a fresh **set-password link** (72 hours). It replaces the link we emailed: only the newest link works, and the screen says so |

**The PDF goes as a secure link.** WhatsApp cannot attach a file from a link, so the message carries a
link such as `https://<staff portal>/d/…` that opens the PDF — the same document as the email
attachment, drawn from the record as it is now — without signing in. Each press makes a new link;
it works for **30 days**. The link is long and random, is not kept anywhere in readable form, and
opens nothing else. If it has expired the customer sees "This link does not open" and asks you to
send the document again. The links name the staff portal's address, so links already sent stop
working if that address changes (section 7).

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

This edition runs Enyo on **Anthropic Claude**: Claude Opus 5.5 for questions that read the records,
and Claude Haiku 5.5 for greetings, short how-to questions, email briefs and Refine. Without these
variables Enyo shows "not switched on yet" and everything else works as normal.

**1. Get a key.** Sign in at **console.anthropic.com** with the company's account:

1. **Billing**: add a payment method (or buy credits). Enyo is paid per use.
2. **Limits**: set a **monthly spend limit** you are comfortable with. When it is reached Enyo says it
   is busy until the next month or until you raise the limit; nothing else in the portal is affected.
3. **API Keys → Create Key**: name it `dphoenix-enyo` and copy it (it starts with `sk-ant-`). It is shown
   only once; if it is lost, delete it and create a new one.

**2. Set the variables in BOTH Vercel projects** (`dphoenix-staff` and `dphoenix-customers`),
Production, then redeploy each:

| Variable | Value |
| --- | --- |
| `ENYO_LLM_PROVIDER` | `anthropic` |
| `ENYO_LLM_API_KEY` | the key from the Anthropic Console (mark it **Sensitive**) |
| `ENYO_LLM_MODEL` | `claude-opus-5-5` |
| `ENYO_LLM_FAST_MODEL` | `claude-haiku-5-5` |
| `ENYO_LLM_PROVIDER_LABEL` | `Anthropic Claude` (the name shown on Settings → Enyo) |
| `ENYO_LLM_EFFORT` | optional: how much the main model thinks before answering — `medium` (default); `low` is faster and cheaper, `high` more thorough |
| `ENYO_LLM_FAST_EFFORT` | optional: the same for the fast model — `low` (default) |

No `ENYO_LLM_BASE_URL` is needed for Anthropic: leave it unset. The two model values are also the
defaults, so the minimum is `ENYO_LLM_PROVIDER` and `ENYO_LLM_API_KEY`.

**3. Check it.** In the staff portal, Settings → Enyo → **Test connection** says "Connected" and how long
the model took. If it shows an error, it names the setting to fix (for example the key, the model name,
billing or the spend limit).

Anthropic's commercial terms say API data is not used to train their models. Enyo only sends the
question and the records needed to answer it, only reads what the signed-in person may see, every
answer links the record it came from, and the key never reaches a browser. Settings → Enyo shows the
provider and lets you switch Enyo off.

Other providers remain possible (secondary for this edition): any OpenAI-compatible model server whose
model supports tool calling — for example OpenAI (`https://api.openai.com/v1`), Groq
(`https://api.groq.com/openai/v1`) or a company server running Ollama. For those, leave
`ENYO_LLM_PROVIDER` unset and set `ENYO_LLM_BASE_URL`, `ENYO_LLM_API_KEY` and `ENYO_LLM_MODEL` instead.

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
| Enyo says "not switched on yet" | `ENYO_LLM_PROVIDER` / `ENYO_LLM_API_KEY` missing in that project; redeploy after adding |
| Enyo says it is busy, every time | Anthropic Console → Limits: the monthly spend limit is reached, or Billing has no credit left |
| Scheduler shows `401` | The secret in Supabase Vault differs from Vercel's `CRON_SECRET`; run v25 again with the right one |
| Something broke after a deploy | Vercel → Deployments → the last good one → **⋯ → Instant Rollback**. Database changes are additive only, so older code keeps working |

More detail on each setting: [OPERATIONS_CHECKLIST.md](OPERATIONS_CHECKLIST.md) (security headers,
firewall, spend limits), [FREE_PLAN.md](FREE_PLAN.md) (staying within free limits),
[ROLES_AND_ACCESS.md](ROLES_AND_ACCESS.md) (every role and permission).
