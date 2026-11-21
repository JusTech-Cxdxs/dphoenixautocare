# The D'Phoenix Autocare demo — sign in as anyone

The demo is a working copy of the Victoria Island workshop that anyone can
be shown without touching a real customer: its own organisation,
**D'Phoenix Autocare (Demo)** (`dphoenix-demo`), with its own Victoria Island
workshop, kept apart from the real organisation (`dphoenix-autocare`),
which never receives a demo record. It has a person for every role —
**Headquarters** (organisation-wide, no branch) and the **Victoria Island
Workshop** — plus two customer-portal sign-ins. Pick a row, sign in, and
the portal shows that person's own view: their menu, their dashboard and
nothing else.

Each row says what that person sees first, **three clicks** that show
their job, and what they **must not** be able to do — try it: the portal
answers *Access denied*. Every demo person is named by their role; no real
person's name is used anywhere in the demo.

*Generated from `apps/portal/lib/demo/people.ts` and `lib/demo/tour.ts`
by `npm run demo:tour-doc`. A test fails if this file and those two ever
differ, and checks every "must not" and every click against the
authorization catalogue; `e2e/demo-tour.spec.ts` signs in as every person
and proves each one in the browser.*

## Switching the demo on

The demo is made only when the platform owner asks for it — never by a
normal deploy:

1. **On the hosting (Vercel):** set `DEMO_STAFF_PASSWORD` (8 characters or
   more) under Settings → Environment Variables → Production, and redeploy.
   The production build makes the demo organisation, its people and
   sign-ins (`scripts/db-push-if-vercel.js`, right after the schema), and
   the first time only, the workshop's seven months of records
   (`npm run demo:ensure`). A later deploy leaves what people did in the
   demo alone.
2. **From the portal:** the platform team (the Master Administrator) opens
   **IT control room → Demo organisation**: *Make the demo organisation*,
   then *Load / refresh the demo now*, or *Remove the demo records*. Typed
   words confirm each step; every step is audited.
3. **From a terminal:** `npm run demo:people` (the organisation and the
   sign-ins), `npm run demo:reset` (everything again as of now),
   `npm run demo:reset -- --remove` (the records out), `npm run demo:pulse`
   (today's working day).

`DEMO_ORG_SLUG` names a different demo organisation (default
`dphoenix-demo`). The real organisation, or any organisation that
already holds its own customers or job cards, is refused. To switch the
demo off: *Not a demo* on the console (its sign-ins are switched off on the
spot), then take `DEMO_STAFF_PASSWORD` out of the environment.

## The 15-minute tour for the directors

Sign in as each person in turn (every address ends with
`@demo.dphoenix.example`; the customer at the customer portal's sign-in page).

| Minutes | Sign in as | Open | Show |
|---|---|---|---|
| 0–2 | `md` | `/dashboard` | The daily brief: job cards open today, money in this week, fleet invoices past their due date, vehicles due for service. |
| 2–4 | `frontdesk` | `/workshop/customers` | A fleet pickup checked in this morning: the company on 30-day credit, the vehicle’s history, the Job Card opened as a service. |
| 4–6 | `tech.3` | `/workshop/job-cards` | Only their jobs. Open one: the diagnosis and the estimate — labour, parts bought outside and sundries, in naira. |
| 6–8 | `manager` | `/approvals` | Approvals in one place: an estimate with a discount above 10% (the Manager’s final word, VAT fixed), a closing, an exit pass. |
| 8–9 | `frontdesk` | `/workshop/job-cards` | The estimate sent to the customer by link (or WhatsApp); the answer by link, in the portal or by phone; the deposit for a private customer. |
| 9–10 | `finance` | `/workshop/job-cards` | A finished job: the invoice with VAT, the receipt for each payment, a fleet invoice on credit and one past its due date. |
| 10–12 | `manager` | `/workshop/service-tracker` | The Service Tracker: who is due, who is overdue, the reminders already sent — by email or WhatsApp. |
| 12–13 | `cso` | `/security/overdue` | Security: the visitor three hours past their time, the exit pass not back yet — what used to be a paper register. |
| 13–14 | `customer.individual` | `/customer-portal` | The customer portal: the estimate waiting for approval, last month’s invoice and receipt, the next service due. |
| 14–15 | `admin` | `/audit-logs` | Control: every action in the audit trail, nothing deleted for good (the Recycle bin), each role only where it belongs. |

## The password

There is **one password for every demo sign-in**, and it is never written
down anywhere in the code or the documentation. It is whatever
`DEMO_STAFF_PASSWORD` is set to in the hosting environment, 8 characters
or more; the customer-portal sign-ins use `DEMO_CUSTOMER_PASSWORD` when
that is set and the staff password otherwise.

- **Not set:** no demo sign-ins exist at all. From a terminal:
  `npm run demo:people`.
- **Already made:** a later build changes nothing — not a password, not an
  account an administrator switched off. To set every demo password again
  (for example after a presentation), set `RESET_DEMO_PASSWORDS=yes` for
  one deploy and remove it; everyone signed in as a demo person is signed
  out.
- **Only the demo organisation** gets demo people: the one marked
  `isDemo` in `organisations`. A demo person found in any other
  organisation is switched off on the next run — never deleted.
- Every address ends with `@demo.dphoenix.example`, a reserved name that is never
  routed: nothing is ever emailed to a demo person, and no real colleague
  can collide with one. Company contacts use example.com addresses. Phone
  numbers are on the 0800 000 range. Employee numbers start with `DEMO-`.
- Every run is audited (`demo.people_loaded`, with counts).

## The people

### Headquarters (organisation-wide, no branch)

| Sign in as | Role · employee no. | First view | Three clicks | Must not |
|---|---|---|---|---|
| `admin@demo.dphoenix.example` — Administrator | Organisation Administrator · DEMO-HQ-001 | The dashboard, the set-up tiles and the day’s audit activity. | 1. Users and roles (`/users`)<br>2. Billing & tax: VAT, the deposit, the discount limit (`/organisation`)<br>3. The audit trail (`/audit-logs`) | Sees everything read-only; opens no job and approves no money (no page to refuse). |
| `md@demo.dphoenix.example` — Managing Director | Managing Director · DEMO-HQ-002 | The daily brief: job cards open, money in, fleet invoices overdue, vehicles due for service. | 1. Business analytics (`/analytics`)<br>2. Job Cards: every status today (`/workshop/job-cards`)<br>3. Customers and fleet accounts (`/crm`) | manage users (`/users`)<br>change settings (`/settings`) |
| `it.admin@demo.dphoenix.example` — IT Administrator | IT Administrator · DEMO-HQ-003 | The IT control room: health, scheduled jobs, sign-in attempts. | 1. IT control room (`/it`)<br>2. Users (`/users`)<br>3. Data Exchange: the Zoho and Excel imports (`/data-exchange`) | open the job cards (`/workshop/job-cards`)<br>open business analytics (`/analytics`) |
| `care.lead@demo.dphoenix.example` — Customer Care Lead | Customer Care Lead · DEMO-HQ-004 | The Support centre: open requests, complaints, due times. | 1. Support centre (`/crm/support`)<br>2. Support analytics (`/crm/support/analytics`)<br>3. Customers (`/crm`) | manage users (`/users`)<br>change the organisation’s structure (`/structure`) |
| `broadcaster@demo.dphoenix.example` — Broadcaster | Communications Officer · DEMO-HQ-005 | Broadcasts: what is running, to whom, and who has read it. | 1. Broadcasts (`/notifications/broadcasts`)<br>2. New broadcast (`/notifications/broadcasts/new`)<br>3. Broadcast analytics (`/notifications/broadcasts/analytics`) | open the job cards (`/workshop/job-cards`)<br>manage users (`/users`) |
| `scheduling@demo.dphoenix.example` — Scheduling Admin | Scheduling Administrator · DEMO-HQ-006 | Today’s appointments and the rooms. | 1. Schedule (`/schedule`)<br>2. Meeting rooms (`/schedule/rooms`)<br>3. Calendar (`/schedule/calendar`) | open the job cards (`/workshop/job-cards`)<br>manage users (`/users`) |
| `calendar@demo.dphoenix.example` — Calendar User | Personal Assistant to the Managing Director · DEMO-HQ-007 | Their own calendar — and nothing of the workshop. | 1. My schedule (`/schedule`)<br>2. Calendar (`/schedule/calendar`)<br>3. My profile (`/profile`) | open the job cards (`/workshop/job-cards`)<br>open business analytics (`/analytics`)<br>manage users (`/users`) |

### Victoria Island Workshop

| Sign in as | Role · employee no. | First view | Three clicks | Must not |
|---|---|---|---|---|
| `manager@demo.dphoenix.example` — Workshop Manager | Workshop Manager · DEMO-VI-001 | Approvals waiting: estimates (and a discount above 10%), closings, cancellations, exit passes. | 1. Approvals (`/approvals`)<br>2. Job Cards: every status today (`/workshop/job-cards`)<br>3. The Service Tracker: due and overdue (`/workshop/service-tracker`) | manage users (`/users`)<br>change settings (`/settings`) |
| `supervisor.cars@demo.dphoenix.example` — Supervisor — Cars | Workshop Supervisor, Cars and SUVs · workshop-passenger · DEMO-VI-002 | The cars and SUVs bay: job cards to accept, assign and check. | 1. Job Cards (`/workshop/job-cards`)<br>2. Vehicles (`/workshop/vehicles`)<br>3. Road tests (`/security/road-tests`) | manage users (`/users`)<br>bring records in (Data Exchange) (`/data-exchange`)<br>change the organisation’s structure (`/structure`) |
| `supervisor.fleet@demo.dphoenix.example` — Supervisor — Fleet | Workshop Supervisor, Fleet and Commercial Vehicles · workshop-commercial · DEMO-VI-003 | The fleet bays: the companies’ pickups, buses and vans. | 1. Job Cards (`/workshop/job-cards`)<br>2. Customers and fleet accounts (`/workshop/customers`)<br>3. The Service Tracker (`/workshop/service-tracker`) | manage users (`/users`)<br>bring records in (Data Exchange) (`/data-exchange`)<br>change the organisation’s structure (`/structure`) |
| `tech.1@demo.dphoenix.example` — Technician 1 | Technician, Cars and SUVs · workshop-passenger · DEMO-VI-004 | Their own jobs only, with what to do next on each. | 1. My job cards (`/workshop/job-cards`)<br>2. Vehicles (`/workshop/vehicles`)<br>3. My profile (`/profile`) | manage users (`/users`)<br>read the audit trail (`/audit-logs`)<br>bring records in (Data Exchange) (`/data-exchange`) |
| `tech.2@demo.dphoenix.example` — Technician 2 | Technician, Diagnostics · workshop-passenger · DEMO-VI-005 | A diagnostics job in rework after the road test; an estimate to write. | 1. My job cards (`/workshop/job-cards`)<br>2. Road tests (`/security/road-tests`)<br>3. My profile (`/profile`) | manage users (`/users`)<br>read the audit trail (`/audit-logs`)<br>bring records in (Data Exchange) (`/data-exchange`) |
| `tech.3@demo.dphoenix.example` — Technician 3 | Technician, Fleet Maintenance · workshop-commercial · DEMO-VI-006 | Fleet maintenance: a service in progress, a repair waiting for parts. | 1. My job cards (`/workshop/job-cards`)<br>2. Exit passes (`/security/exit-passes`)<br>3. My profile (`/profile`) | manage users (`/users`)<br>read the audit trail (`/audit-logs`)<br>bring records in (Data Exchange) (`/data-exchange`) |
| `frontdesk@demo.dphoenix.example` — Front Desk | Front Desk Officer · DEMO-VI-007 | Today’s check-ins, estimates to send, vehicles ready for collection, visitors expected. | 1. Customers (`/workshop/customers`)<br>2. The Service Tracker: remind by email or WhatsApp (`/workshop/service-tracker`)<br>3. My visitors (`/security/my-visitors`) | manage users (`/users`)<br>read the audit trail (`/audit-logs`)<br>change billing & tax and the organisation’s details (`/organisation`) |
| `finance@demo.dphoenix.example` — Finance Officer | Finance Officer · DEMO-VI-008 | Money: deposits and balances, invoices and receipts, the fleet accounts on credit. | 1. Job Cards and their invoices (`/workshop/job-cards`)<br>2. Refunds (`/workshop/refunds`)<br>3. Business figures (`/analytics`) | manage users (`/users`)<br>change settings (`/settings`) |
| `cso@demo.dphoenix.example` — Chief Security Officer | Chief Security Officer · DEMO-VI-009 | The Security desk: overdue items first. | 1. Overdue (`/security/overdue`)<br>2. Incidents (`/security/incidents`)<br>3. On the premises (`/security/on-premises`) | manage users (`/users`)<br>see refunds (`/workshop/refunds`)<br>bring records in (Data Exchange) (`/data-exchange`) |
| `gate@demo.dphoenix.example` — Security Officer — Gate | Security Officer, Main Gate · DEMO-VI-010 | The gate: who is expected, who is in, what is going out. | 1. The register (`/security/register`)<br>2. Visitors (`/security/visitors`)<br>3. Vehicles inside (`/security/vehicles-inside`) | manage users (`/users`)<br>see refunds (`/workshop/refunds`)<br>bring records in (Data Exchange) (`/data-exchange`) |
| `care@demo.dphoenix.example` — Customer Care | Customer Care Officer · DEMO-VI-011 | The workshop’s Support centre: the complaint about a scratch, a question about an estimate. | 1. Support centre (`/crm/support`)<br>2. Customers (`/crm`)<br>3. New request (`/crm/support/new`) | manage users (`/users`)<br>bring records in (Data Exchange) (`/data-exchange`) |
| `dept.head@demo.dphoenix.example` — Head of Department — Fleet | Head of Department, Fleet Maintenance · workshop-commercial · DEMO-VI-012 | Exit passes waiting for the head of department. | 1. Exit passes (`/security/exit-passes`)<br>2. Approvals (`/approvals`)<br>3. My profile (`/profile`) | manage users (`/users`)<br>bring records in (Data Exchange) (`/data-exchange`) |

### Customer portal

| Sign in as | Who | What to show |
|---|---|---|
| `customer.individual@demo.dphoenix.example` | Tolani Bamgbose | Their Toyota Camry: the estimate waiting for their approval in the portal, the invoice and receipt for last month’s service, the next service due. |
| `customer.fleet@demo.dphoenix.example` | SEEPCO (fleet, on credit) | A fleet of Hilux, Land Cruiser and Hiace vehicles on 30-day credit terms: the job cards open today, an invoice past its due date, the vehicles due for service. |

## What each scenario shows

- **Fleets on credit.** Six organisation customers — SEEPCO, RCL Africa,
  Nairda Limited, Desicon Engineering, Dori Construction and Inspiration FM
  — each with a Fleet Manager on the account, credit terms approved by
  Finance (15 to 45 days) and a handful of vehicles: Toyota Hilux, Hiace,
  Land Cruiser and Corolla, Ford Ranger, Nissan Patrol, Mitsubishi L200,
  Hyundai H-100 and a Mercedes-Benz Sprinter. They pay no deposit; their
  vehicles leave once the invoice is issued, and the invoice is due on the
  issue date plus their terms. Most are paid by transfer; some are not yet
  due; a few are **past their due date** (Customers → the company's page,
  and the dashboard).
- **Private customers.** A dozen individuals with their own cars (Camry,
  RX 350, Highlander, C300, Venza, Accord, Sienna, ES 350, RAV4 and more,
  2006 to date). They pay a 50% deposit before work starts and the balance
  on collection.
- **Repairs and services, one Job Card.** Seven months of Job Cards, about
  half of them services (Service ticked), in every status today: checked
  in, waiting for the customer, in progress, waiting for parts bought
  outside, quality check (one sent back for rework after its road test),
  completed, ready for collection, closed, checked out and cancelled (one
  with its deposit refunded).
- **Estimates in naira.** Labour, parts bought outside and sundries at
  Victoria Island prices, VAT at 7.5% fixed when the Manager approves, 10%
  off labour for some fleets, a few whole-estimate discounts (above 10%,
  approved by the Manager).
- **The customer's answer.** By the secure link (sent by email or
  WhatsApp), in the customer portal, by phone (taken down by the Front
  Desk) or by paying the deposit at the counter — and one estimate the
  customer declined, asking for a cheaper option.
- **Invoices and receipts.** Every finished Job Card has its invoice (the
  number, VAT, any discount, what was paid when it was issued) and every
  payment its receipt (RCT-…).
- **The Service Tracker.** Vehicles due for service soon and overdue (by
  date or by kilometres), with the reminders already sent; *Send reminder*
  by email or *Send on WhatsApp* for the rest.
- **Security, Scheduling, Support.** Visitors (one past their time today),
  exit passes (one out and overdue, one waiting for the head of
  department), road tests, incidents, parts deliveries at the gate, the
  morning meeting, broadcasts and support requests, including a complaint.
- **Data Exchange.** The cut-over imports — the Zoho Books contacts and
  invoices, the workshop's own vehicles register and past jobs, the staff
  list — and exports made since.

Nothing of the Store, Warranty, the assembly plant or SAP: those are off in
this edition.

## Every day after

The demo does not go stale: each Lagos day adds its own working day —
check-ins this morning (repairs and a service), yesterday's estimates
written and approved and waiting for the Manager, a service booked for
tomorrow, visitors, the morning meeting, new support requests.
`DEMO_DAILY_ACTIVITY=off` stops it. The platform team reloads the whole
story from **IT control room → Demo organisation**, or from a terminal with
`npm run demo:reset`.
