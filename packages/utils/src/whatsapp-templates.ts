/**
 * The WhatsApp template catalogue: the one list of every automatic WhatsApp
 * message, shared by both apps (pure: no database, no network).
 *
 * A message the business starts on WhatsApp must use a template Meta has
 * approved, created in WhatsApp Manager with exactly this name, category,
 * language, body text and samples. docs/WHATSAPP_TEMPLATES.md is made from
 * this file (renderTemplatesDoc; a test keeps the two the same), so the
 * owner can create each one in Meta word for word.
 *
 * Each template mirrors an email: the same moment, the same facts, short and
 * plain — the workshop's name, the document's number, money as ₦12,345.00,
 * the date, the customer-portal or staff-portal link. Body parameters are
 * {{1}}, {{2}}, … in order; `name` (the greeting: a person's first name, an
 * organisation's name) and `workshop` (the organisation's name) are filled
 * in by the sender, the rest by the caller. Where the email carries a PDF
 * the template has a DOCUMENT header and the PDF goes with the message.
 *
 * EMAIL_COVERAGE says, for every email the apps can send (each file in
 * lib/email-templates), which WhatsApp template goes with it, or why it
 * stays email-only. A test reads both email-template folders and fails on
 * any email left out.
 */

export type TemplateCategory = 'UTILITY' | 'MARKETING';
export type TemplateParam = { readonly key: string; readonly example: string };
export type WhatsAppTemplateDef = {
  readonly key: string;
  /** The template's name in Meta: lowercase letters, digits and underscores, beginning dpa_. */
  readonly name: string;
  readonly category: TemplateCategory;
  readonly audience: 'customer' | 'staff';
  /** When it is sent, in plain words (for the doc and Settings → WhatsApp). */
  readonly when: string;
  /** DOCUMENT: the PDF goes with the message, as its header. */
  readonly header: 'DOCUMENT' | null;
  readonly body: string;
  readonly params: readonly TemplateParam[];
  readonly footer: string;
};

const CUSTOMER_FOOTER = 'Automatic message. Please call the workshop to reach us.';
const STAFF_FOOTER = 'Automatic notice from the staff portal.';

const SAMPLE = {
  name: { key: 'name', example: 'Tolani' },
  workshop: { key: 'workshop', example: "D'Phoenix Autocare" },
  vehicle: { key: 'vehicle', example: 'Toyota Camry (EKY 482 KJ)' },
  record: { key: 'record', example: 'Job Card JC-2026-000123' },
  portal: { key: 'link', example: 'https://www.example.com/customer-portal/dashboard' },
  jobLink: { key: 'link', example: 'https://www.example.com/customer-portal/dashboard/services/jc/abc123' },
  branch: { key: 'branch', example: 'Victoria Island' },
  details: { key: 'details', example: 'Customer: Tolani Bamgbose. Vehicle: Toyota Camry.' },
  staffLink: { key: 'link', example: 'https://staff.example.com/workshop/job-cards/abc123' },
} as const;

/** Every automatic WhatsApp message. Order: customers, then staff. */
export const WHATSAPP_TEMPLATES = [
  // ── Customers: the Job Card (or Vehicle Service) from check-in to collection ──
  {
    key: 'job_checked_in', name: 'dpa_job_checked_in', category: 'UTILITY', audience: 'customer', header: null,
    when: 'The vehicle is checked in: a new Job Card (also a service that continues as a Job Card).',
    body: 'Hello {{1}}, thank you for bringing your {{2}} to {{3}}. We have checked it in under {{4}}, and the inspection will start shortly. We will send you the estimate when it is ready.\n\nFollow each step in your customer portal: {{5}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.workshop, SAMPLE.record, SAMPLE.jobLink],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'job_work_started', name: 'dpa_job_work_started', category: 'UTILITY', audience: 'customer', header: null,
    when: 'Work starts on the vehicle (the Job Card moves to In progress).',
    body: 'Hello {{1}}, our technicians have started work on your {{2}} under {{3}}. There is nothing you need to do for now.\n\nFollow each step in your customer portal: {{4}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, SAMPLE.jobLink],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'job_work_update', name: 'dpa_job_work_update', category: 'UTILITY', audience: 'customer', header: null,
    when: 'Work resumes after waiting for parts, or the vehicle goes back for more work after its final checks.',
    body: 'Hello {{1}}, here is an update on your {{2}} under {{3}}.\n\nWhat is happening: {{4}}\n\nThere is nothing you need to do. Follow each step in your customer portal: {{5}}\n\nThank you for your patience.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, { key: 'update', example: 'the parts we were waiting for have arrived, and work has started again.' }, SAMPLE.jobLink],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'job_quality_check', name: 'dpa_job_quality_check', category: 'UTILITY', audience: 'customer', header: null,
    when: 'The work is done and the vehicle is in final quality checks.',
    body: 'Hello {{1}}, the work on your {{2}} under {{3}} is finished. Our quality team is now carrying out final checks, including a road test.\n\nFollow each step in your customer portal: {{4}}\n\nWe will let you know when it is ready.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, SAMPLE.jobLink],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'job_completed', name: 'dpa_job_completed', category: 'UTILITY', audience: 'customer', header: null,
    when: 'The vehicle passes its final quality inspection (Completed), or a Vehicle Service is completed.',
    body: 'Hello {{1}}, the work on your {{2}} under {{3}} is complete and has passed our final checks. We are preparing it for collection and will send you the collection details shortly.\n\nSee it in your customer portal: {{4}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, SAMPLE.jobLink],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'ready_for_collection', name: 'dpa_ready_for_collection', category: 'UTILITY', audience: 'customer', header: null,
    when: 'The vehicle is ready for collection; also the collection reminder from Vehicles in custody.',
    body: 'Hello {{1}}, your {{2}} is ready for collection at {{3}}. Your reference is {{4}}. Please collect it by {{5}}; storage charges may apply after that date.\n\nPlease make sure any balance is paid before collection, and bring a form of identification. If someone else is collecting for you, let the branch know beforehand.\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.branch, SAMPLE.record, { key: 'collectBy', example: 'Friday, 4 December 2026' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'cancelled_vehicle_waiting', name: 'dpa_cancelled_vehicle_waiting', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A cancelled Job Card (or Vehicle Service) whose vehicle is still at the branch: the collection notice.',
    body: 'Hello {{1}}, your {{2}} is still with us at {{3}}, after {{4}} was cancelled. Please arrange to collect it as soon as you can.\n\nIf you need a different arrangement, please call the branch and we will work it out with you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.branch, SAMPLE.record],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'vehicle_collected', name: 'dpa_vehicle_collected', category: 'UTILITY', audience: 'customer', header: null,
    when: 'The vehicle is checked out (collected).',
    body: 'Hello {{1}}, this confirms that your {{2}} has been collected under {{3}}, by {{4}}.\n\nNext service: {{5}}\n\nIf you did not collect it yourself or authorise this person, call us straight away.\n\nThank you for choosing {{6}}. We look forward to seeing you again.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, { key: 'collectedBy', example: 'Tolani Bamgbose' }, { key: 'nextService', example: 'due at 95,000 km or by 20 May 2027, whichever comes first.' }, SAMPLE.workshop],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'job_cancelled', name: 'dpa_job_cancelled', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A Job Card (or Vehicle Service) is cancelled.',
    body: 'Hello {{1}}, as requested, we have cancelled {{2}} for your {{3}}. No further work will be carried out under it.\n\nIf your vehicle is still with us, please arrange to collect it. If you paid anything towards this job, we will contact you about it.\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.record, SAMPLE.vehicle],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'job_closed', name: 'dpa_job_closed', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A Job Card (or Vehicle Service) is closed: the work and payment are settled.',
    body: 'Hello {{1}}, the job on your {{2}} under {{3}} is now closed. The work and payment are settled, and the full record stays in your customer portal: {{4}}\n\nThank you for choosing {{5}}. We hope to see you again.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, SAMPLE.portal, SAMPLE.workshop],
    footer: CUSTOMER_FOOTER,
  },

  // ── Customers: the estimate, the invoice, payments and refunds ──
  {
    key: 'estimate_ready', name: 'dpa_estimate_ready', category: 'UTILITY', audience: 'customer', header: 'DOCUMENT',
    when: 'The Manager-approved estimate is sent to the customer (with the estimate PDF), from the Job Card or a Vehicle Service; also "Send now on WhatsApp" for the estimate.',
    body: 'Hello {{1}}, the estimate for your {{2}} under {{3}} is ready, with a total of {{4}}.\n\nTo start the work: {{5}}\n\nThe estimate is attached. Approve or decline it here: {{6}}\n\nYou can also answer in your customer portal or call the branch. Thank you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, { key: 'total', example: '₦116,000.00' }, { key: 'deposit', example: 'a deposit of ₦81,200.00 is needed once you approve.' }, { key: 'link', example: 'https://www.example.com/approve/AbCdEf123' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'estimate_approval_link', name: 'dpa_estimate_approval_link', category: 'UTILITY', audience: 'customer', header: null,
    when: 'Staff send the customer a secure link to approve or decline the estimate.',
    body: 'Hello {{1}}, here is a secure link to approve the estimate for your {{2}} under {{3}}, or to tell us you do not want the work: {{4}}\n\nEstimate total: {{5}}. The link works once and stops working on {{6}}. Any earlier link no longer works.\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, { key: 'link', example: 'https://www.example.com/approve/AbCdEf123' }, { key: 'total', example: '₦116,000.00' }, { key: 'expiresOn', example: '28 November 2026' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'estimate_reminder', name: 'dpa_estimate_reminder', category: 'UTILITY', audience: 'customer', header: null,
    when: 'The estimate is still waiting for the customer’s answer (the approval reminder, by hand or by the daily check).',
    body: 'Hello {{1}}, the estimate for your {{2}} under {{3}} is still waiting for your go-ahead. {{4}} Please answer by {{5}}.\n\nApprove or decline it here: {{6}}\n\nIf something is holding you up, call the branch and we will work it out with you.',
    params: [SAMPLE.name, SAMPLE.vehicle, SAMPLE.record, { key: 'start', example: 'Work starts as soon as you approve it.' }, { key: 'answerBy', example: 'Friday, 27 November 2026' }, SAMPLE.jobLink],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'invoice', name: 'dpa_invoice', category: 'UTILITY', audience: 'customer', header: 'DOCUMENT',
    when: 'An invoice is issued and emailed (on completion, or "Email invoice"); also "Send now on WhatsApp" for the invoice.',
    body: 'Hello {{1}}, your invoice {{2}} for {{3}} comes to {{4}}.\n\nBalance: {{5}}\n\nThe invoice is attached. See it in your customer portal: {{6}}\n\nThank you for choosing {{7}}. We appreciate your business.',
    params: [SAMPLE.name, { key: 'invoiceNumber', example: 'INV-2026-000012' }, SAMPLE.record, { key: 'total', example: '₦403,125.00' }, { key: 'balance', example: '₦403,125.00 to pay by 20 December 2026.' }, { key: 'link', example: 'https://www.example.com/customer-portal/dashboard/services/jc/abc123/invoice' }, SAMPLE.workshop],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'payment_receipt', name: 'dpa_payment_receipt', category: 'UTILITY', audience: 'customer', header: 'DOCUMENT',
    when: 'A payment is recorded on a Job Card (with the receipt PDF); also "Send now on WhatsApp" for a receipt.',
    body: 'Hello {{1}}, we have received {{2}} on {{3}} for {{4}}. Your receipt number is {{5}}.\n\nBalance: {{6}}\n\nYour receipt is attached; please keep it for your records. Thank you.',
    params: [SAMPLE.name, { key: 'amount', example: '₦50,000.00' }, { key: 'paidOn', example: '20 November 2026' }, SAMPLE.record, { key: 'receiptNumber', example: 'RCT-2026-000077' }, { key: 'balance', example: '₦66,000.00 still to pay.' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'payment_received', name: 'dpa_payment_received', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A payment is recorded on a (separate) Vehicle Service, whose email carries no PDF.',
    body: 'Hello {{1}}, thank you: we have received your payment of {{2}} on {{3}} for {{4}}.\n\nBalance: {{5}}\n\nPlease keep this message for your records. Thank you.',
    params: [SAMPLE.name, { key: 'amount', example: '₦50,000.00' }, { key: 'paidOn', example: '20 November 2026' }, { key: 'record', example: 'Vehicle Service VS-2026-000045' }, { key: 'balance', example: 'nothing more is owed. Thank you.' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'refund', name: 'dpa_refund', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A refund is recorded (the refund receipt email; there is no refund PDF).',
    body: 'Hello {{1}}, we have refunded {{2}} to you on {{3}} by {{4}}, for {{5}}. Your refund receipt number is {{6}}.\n\nStill to be refunded: {{7}}\n\nPlease keep this message as your receipt. Thank you.',
    params: [SAMPLE.name, { key: 'amount', example: '₦25,000.00' }, { key: 'refundedOn', example: '21 November 2026' }, { key: 'method', example: 'bank transfer' }, SAMPLE.record, { key: 'referenceNumber', example: 'RFD-2026-000004' }, { key: 'remaining', example: 'nothing, your refund is complete.' }],
    footer: CUSTOMER_FOOTER,
  },

  // ── Customers: reminders, the portal, support and announcements ──
  {
    key: 'service_reminder', name: 'dpa_service_reminder', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A vehicle is due or past due for its service (Service Tracker reminders, by hand or automatic).',
    body: 'Hello {{1}}, your {{2}} is {{3}}.\n\nCall us, or see it in your customer portal, to book a convenient day: {{4}}\n\nThank you for choosing {{5}}. We look forward to seeing you.',
    params: [SAMPLE.name, SAMPLE.vehicle, { key: 'due', example: 'due for its service at 85,250 km or 4 December 2026, whichever comes first' }, SAMPLE.portal, SAMPLE.workshop],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'welcome', name: 'dpa_welcome', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A new customer is registered and their customer portal account is opened (the welcome email). The set-password link itself stays in the email.',
    body: 'Hello {{1}}, welcome to {{2}}. Your customer portal account is ready, so you can follow your vehicles, Job Cards, estimates and payments online.\n\nWe have emailed {{3}} a link to set your password. Then sign in at {{4}}\n\nThank you for choosing us.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'email', example: 'tolani@example.com' }, { key: 'link', example: 'https://www.example.com/customer-portal/sign-in' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'support_received', name: 'dpa_support_received', category: 'UTILITY', audience: 'customer', header: null,
    when: 'A customer’s support request is received (by email, the customer portal or Enyo’s hand-over).',
    body: 'Hello {{1}}, thank you for contacting {{2}}. We have your request {{3}} about {{4}}, and our team will reply by email and in your customer portal: {{5}}\n\nIf your vehicle is unsafe to drive or you are stranded, please call us now.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'ticketNumber', example: 'SUP-2026-000031' }, { key: 'subject', example: 'noise from the front wheel' }, { key: 'link', example: 'https://www.example.com/customer-portal/dashboard/support' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'support_reply', name: 'dpa_support_reply', category: 'UTILITY', audience: 'customer', header: null,
    when: 'Our team (or Enyo, when allowed) replies on a customer’s support request.',
    body: 'Hello {{1}}, we have replied to your request {{2}} about {{3}}.\n\nOur reply: {{4}}\n\nThe full reply is in your email. You can answer in your customer portal: {{5}}\n\nThank you.',
    params: [SAMPLE.name, { key: 'ticketNumber', example: 'SUP-2026-000031' }, { key: 'subject', example: 'noise from the front wheel' }, { key: 'reply', example: 'We have booked your vehicle in for Monday at 10am. Please bring the spare key.' }, { key: 'link', example: 'https://www.example.com/customer-portal/dashboard/support' }],
    footer: CUSTOMER_FOOTER,
  },
  {
    key: 'customer_announcement', name: 'dpa_customer_announcement', category: 'MARKETING', audience: 'customer', header: null,
    when: 'A broadcast to customers (Notifications → Broadcasts), to customers who chose announcements.',
    body: 'Hello {{1}}, here is a message from {{2}}, titled “{{3}}”.\n\nIn short: {{4}}\n\nRead it in your customer portal: {{5}}\n\nYou can switch WhatsApp messages off in your customer portal profile.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'title', example: 'Closed on Monday for the public holiday' }, { key: 'message', example: 'All branches are closed on Monday. Vehicles due for collection that day can be collected on Tuesday.' }, SAMPLE.portal],
    footer: CUSTOMER_FOOTER,
  },

  // ── Staff: what waits for them, on their phone ──
  {
    key: 'staff_approval', name: 'dpa_staff_approval', category: 'UTILITY', audience: 'staff', header: null,
    when: 'Something waits for the colleague’s approval or check: an estimate to validate or approve, a cancellation or close request.',
    body: 'Hello {{1}}, something is waiting for your approval at {{2}}. What: {{3}}\n\nDetails: {{4}}\n\nOpen it in the staff portal: {{5}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'what', example: 'the estimate on Job Card JC-2026-000123' }, SAMPLE.details, SAMPLE.staffLink],
    footer: STAFF_FOOTER,
  },
  {
    key: 'staff_assigned', name: 'dpa_staff_assigned', category: 'UTILITY', audience: 'staff', header: null,
    when: 'A Job Card, Vehicle Service or support request is assigned to the colleague.',
    body: 'Hello {{1}}, you have a new assignment at {{2}}. What: {{3}}\n\nDetails: {{4}}\n\nOpen it in the staff portal: {{5}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'what', example: 'Job Card JC-2026-000123' }, SAMPLE.details, SAMPLE.staffLink],
    footer: STAFF_FOOTER,
  },
  {
    key: 'staff_visitor', name: 'dpa_staff_visitor', category: 'UTILITY', audience: 'staff', header: null,
    when: 'A visitor for the colleague has arrived (Security or Reception).',
    body: 'Hello {{1}}, your visitor has arrived at {{2}}.\n\nDetails: {{3}}\n\nOpen it in the staff portal: {{4}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'details', example: 'Chinedu Okafor (VIS-2026-000014) is at Reception.' }, { key: 'link', example: 'https://staff.example.com/security/visitors/abc123' }],
    footer: STAFF_FOOTER,
  },
  {
    key: 'staff_announcement', name: 'dpa_staff_announcement', category: 'UTILITY', audience: 'staff', header: null,
    when: 'A broadcast to staff (Notifications → Broadcasts).',
    body: 'Hello {{1}}, there is a new notice from {{2}}, titled “{{3}}”.\n\nIn short: {{4}}\n\nRead it in the staff portal: {{5}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'title', example: 'Stock count on Saturday' }, { key: 'message', example: 'Everyone in the Store is needed from 8am. Overtime applies.' }, { key: 'link', example: 'https://staff.example.com/notifications?tab=broadcasts' }],
    footer: STAFF_FOOTER,
  },
  {
    key: 'staff_update', name: 'dpa_staff_update', category: 'UTILITY', audience: 'staff', header: null,
    when: 'A work notice for the colleague: a vehicle ready for quality check or sent back, the customer answered the estimate, a deposit met, a vehicle released at the gate, an appointment, a support request waiting, a decision on their request.',
    body: 'Hello {{1}}, there is an update for you at {{2}}. What: {{3}}\n\nDetails: {{4}}\n\nOpen it in the staff portal: {{5}}\n\nThank you.',
    params: [SAMPLE.name, SAMPLE.workshop, { key: 'what', example: 'Ready for quality check: Job Card JC-2026-000123' }, SAMPLE.details, SAMPLE.staffLink],
    footer: STAFF_FOOTER,
  },
] as const satisfies readonly WhatsAppTemplateDef[];

export type WhatsAppTemplate = (typeof WHATSAPP_TEMPLATES)[number];
export type WhatsAppTemplateKey = WhatsAppTemplate['key'];
export type CustomerTemplateKey = Extract<WhatsAppTemplate, { audience: 'customer' }>['key'];
export type StaffTemplateKey = Extract<WhatsAppTemplate, { audience: 'staff' }>['key'];
export type DocumentTemplateKey = Extract<WhatsAppTemplate, { header: 'DOCUMENT' }>['key'];

/** The parameter names of one template, in order. */
export type ParamKeysOf<K extends WhatsAppTemplateKey> = Extract<WhatsAppTemplate, { key: K }>['params'][number]['key'];

/** Filled in by the sender: the greeting name and the organisation's name. */
export type AutoParam = 'name' | 'workshop';

/** What a caller passes: every parameter but the greeting name and the workshop (which it may still give). */
export type ParamValues<K extends WhatsAppTemplateKey> = { [P in Exclude<ParamKeysOf<K>, AutoParam>]: string } & { [P in Extract<ParamKeysOf<K>, AutoParam>]?: string };

export function templateFor(key: string): WhatsAppTemplateDef | null {
  return (WHATSAPP_TEMPLATES as readonly WhatsAppTemplateDef[]).find((t) => t.key === key) ?? null;
}

/** The numbered placeholders in a body, in the order they appear: "{{1}} … {{2}}" gives [1, 2]. */
export function placeholdersOf(body: string): number[] {
  return [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
}

/**
 * The body parameters in order, from the caller's values and the sender's
 * name and workshop. A missing value is "-" (Meta refuses an empty one).
 */
export function bodyParameters(t: WhatsAppTemplateDef, values: Record<string, string | null | undefined>): string[] {
  return t.params.map((p) => {
    const v = values[p.key];
    return typeof v === 'string' && v.trim() ? v : '-';
  });
}

/** The body as the recipient reads it (for the test send's preview and the doc's example). */
export function renderBody(t: WhatsAppTemplateDef, parameters: readonly string[]): string {
  return t.body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => parameters[Number(n) - 1] ?? '');
}

// ── Which WhatsApp message goes with each email ──────────────────────

export type EmailCoverage =
  | {
      readonly whatsapp: readonly WhatsAppTemplateKey[];
      readonly note?: string;
      /** Files (relative to the app) that send this email for a moment that stays email-only, and why. */
      readonly exceptIn?: Readonly<Record<string, string>>;
    }
  | { readonly emailOnly: string; readonly off?: 'inventory' | 'warranty' | 'externalProcurement' };

const PASSWORD_ONLY_BY_EMAIL = 'Password and sign-in links stay email-only: a set-password or reset link is a key to the account, and a phone number can be shared, recycled or read by someone else, while the account belongs to the email address. (WhatsApp authentication templates are a separate Meta category for one-time codes, which the portal does not use.)';
const RECORD_ONLY = 'A record of something already done; nothing waits on the colleague, so the email and the portal’s notifications carry it and a phone is not buzzed for it.';
const OFF_INVENTORY = 'The Store and parts sourcing are switched off in this edition, so this email is never sent. Give it a template before switching Inventory back on.';
const OFF_WARRANTY = 'Warranty is switched off in this edition, so this email is never sent. Give it a template before switching Warranty back on.';
const OFF_PROCUREMENT = 'Outside-purchase approvals are switched off in this edition, so this email is never sent. Give it a template before switching them back on.';

/**
 * Every email template file in apps/portal/lib/email-templates ("portal:…")
 * and apps/website/lib/email-templates ("website:…"): the WhatsApp
 * templates sent with it, or why it stays email-only.
 */
export const EMAIL_COVERAGE: Record<string, EmailCoverage> = {
  // Customers — the Job Card
  'portal:customer-job-card-acknowledgment': { whatsapp: ['job_checked_in'] },
  'portal:customer-job-in-progress': { whatsapp: ['job_work_started'] },
  'portal:customer-job-work-update': { whatsapp: ['job_work_update'] },
  'portal:customer-quality-check': { whatsapp: ['job_quality_check'] },
  'portal:customer-job-completed': { whatsapp: ['job_completed'] },
  'portal:customer-ready-for-collection': { whatsapp: ['ready_for_collection'] },
  'portal:customer-collection-overdue': { whatsapp: ['cancelled_vehicle_waiting'] },
  'portal:customer-vehicle-checked-out': { whatsapp: ['vehicle_collected'] },
  'portal:customer-job-card-cancelled': { whatsapp: ['job_cancelled'] },
  'portal:customer-job-card-closed': { whatsapp: ['job_closed'] },
  'portal:customer-estimate-approved': { whatsapp: ['estimate_ready'] },
  'portal:customer-estimate-approval-link': { whatsapp: ['estimate_approval_link'] },
  'portal:customer-approval-reminder': { whatsapp: ['estimate_reminder'] },
  'portal:customer-invoice': { whatsapp: ['invoice'] },
  'portal:customer-payment-received': { whatsapp: ['payment_receipt'] },
  'portal:customer-refund-receipt': { whatsapp: ['refund'] },
  // Customers — a (separate) Vehicle Service
  'portal:customer-service-estimate-approved': { whatsapp: ['estimate_ready'] },
  'portal:customer-service-completed': { whatsapp: ['job_completed'] },
  'portal:customer-service-ready-for-collection': { whatsapp: ['ready_for_collection'] },
  'portal:customer-service-collection-overdue': { whatsapp: ['cancelled_vehicle_waiting'] },
  'portal:customer-service-checked-out': { whatsapp: ['vehicle_collected'] },
  'portal:customer-service-cancelled': { whatsapp: ['job_cancelled'] },
  'portal:customer-service-closed': { whatsapp: ['job_closed'] },
  'portal:customer-service-payment-received': { whatsapp: ['payment_received'] },
  // Customers — reminders, the portal, support, announcements
  'portal:service-reminder': { whatsapp: ['service_reminder'] },
  'portal:customer-welcome': { whatsapp: ['welcome'], note: 'The welcome goes on WhatsApp without the set-password link, which stays in the email (see password-reset). Sending the link again ("Send set-password link") is email-only for the same reason; staff can still share it by hand with "Send on WhatsApp".' },
  'portal:customer-support-reply': { whatsapp: ['support_reply'] },
  'portal:support-centre': { whatsapp: ['support_received', 'support_reply'], note: 'The acknowledgement and the replies go on WhatsApp. The follow-up nudge ("we are waiting for your reply") and the satisfaction question stay email-only: they ask for an answer by email.' },
  'portal:customer-broadcast': { whatsapp: ['customer_announcement'], note: 'A MARKETING template (Meta’s rule for announcements): only to customers who chose announcements and agreed to WhatsApp.' },
  'portal:customer-warranty-certificate': { emailOnly: OFF_WARRANTY, off: 'warranty' },
  'portal:customer-warranty-expiry': { emailOnly: OFF_WARRANTY, off: 'warranty' },
  'website:support': { whatsapp: ['support_received', 'staff_update'], note: 'The customer’s acknowledgement, and the colleague handling the request when the customer replies. A new request goes to the organisation’s shared inbox, which has no phone.' },
  'website:estimate-answer': { whatsapp: ['staff_update'] },
  'website:customer-password-reset': { emailOnly: PASSWORD_ONLY_BY_EMAIL },

  // Staff — waiting for them
  'portal:estimate-submitted-for-validation': { whatsapp: ['staff_approval'] },
  'portal:estimate-ready-for-manager': { whatsapp: ['staff_approval'] },
  'portal:service-estimate-submitted': { whatsapp: ['staff_approval'] },
  'portal:service-estimate-ready-for-manager': { whatsapp: ['staff_approval'] },
  'portal:cancellation-requested': { whatsapp: ['staff_approval'] },
  'portal:close-requested': { whatsapp: ['staff_approval'] },
  'portal:service-cancellation-requested': { whatsapp: ['staff_approval'] },
  'portal:service-close-requested': { whatsapp: ['staff_approval'] },
  'portal:supervisor-job-card-assigned': { whatsapp: ['staff_assigned'] },
  'portal:technician-job-card-assigned': { whatsapp: ['staff_assigned'] },
  'portal:supervisor-vehicle-service-assigned': { whatsapp: ['staff_assigned'] },
  'portal:technician-vehicle-service-assigned': { whatsapp: ['staff_assigned'] },
  'portal:support-staff': { whatsapp: ['staff_assigned', 'staff_update'] },
  'portal:estimate-ready-for-customer-notification': { whatsapp: ['staff_update'] },
  'portal:estimate-nudge': { whatsapp: ['staff_update'] },
  'portal:service-estimate-nudge': { whatsapp: ['staff_update'] },
  'portal:service-estimate-ready-for-customer-notification': { whatsapp: ['staff_update'] },
  'portal:technician-response-notification': { whatsapp: ['staff_update'] },
  'portal:technician-vehicle-service-response': { whatsapp: ['staff_update'] },
  'portal:job-card-decision': { whatsapp: ['staff_update'] },
  'portal:vehicle-service-decision': { whatsapp: ['staff_update'] },
  'portal:vehicle-service-escalated-staff': { whatsapp: ['staff_update'] },
  'portal:cancellation-declined': { whatsapp: ['staff_update'] },
  'portal:close-request-declined': { whatsapp: ['staff_update'] },
  'portal:service-cancellation-declined': { whatsapp: ['staff_update'] },
  'portal:service-close-request-declined': { whatsapp: ['staff_update'] },
  'portal:payment-requirement-met': { whatsapp: ['staff_update'] },
  'portal:service-payment-requirement-met': { whatsapp: ['staff_update'] },
  'portal:workflow-notice': {
    whatsapp: ['staff_update'],
    note: 'The workflow notices that ask a colleague to act (ready for quality check, rework, the customer approved, and the other steps handed on) go on WhatsApp; an outcome they only need to know stays email-only. Its account notices stay email-only: they are about the account, which belongs to the email address.',
    exceptIn: {
      'lib/auth.ts': 'Confirming an email address: about the account, email only.',
      'lib/actions/users-admin.ts': 'An account switched back on: about the account, email only.',
    },
  },
  'portal:warranty-staff-notice': { whatsapp: ['staff_update', 'staff_visitor', 'staff_announcement'], note: 'The staff notice used by Security (a visitor arrived, a vehicle released at the gate, passes and permits), Scheduling (appointments and their reminders), reminders, staff broadcasts and branch notices (a bank account changed). The day’s appointment digest and the end of an assisted session stay email-only (one summary read at the desk; a notice about the colleague’s own account).' },
  // Staff — email-only
  'portal:job-card-cancelled-staff': { emailOnly: RECORD_ONLY },
  'portal:job-card-closed-staff': { emailOnly: RECORD_ONLY },
  'portal:vehicle-checked-out-staff': { emailOnly: RECORD_ONLY },
  'portal:vehicle-service-cancelled-staff': { emailOnly: RECORD_ONLY },
  'portal:vehicle-service-checked-out-staff': { emailOnly: RECORD_ONLY },
  'portal:vehicle-service-closed-staff': { emailOnly: RECORD_ONLY },
  'portal:payment-recorded-update': { emailOnly: RECORD_ONLY },
  'portal:payment-completed-in-full': { emailOnly: RECORD_ONLY },
  'portal:service-payment-recorded-update': { emailOnly: RECORD_ONLY },
  'portal:service-payment-completed-in-full': { emailOnly: RECORD_ONLY },
  'portal:password-reset': { emailOnly: PASSWORD_ONLY_BY_EMAIL },
  'portal:staff-access': { emailOnly: PASSWORD_ONLY_BY_EMAIL },
  'portal:personal-mail': { emailOnly: 'A colleague’s own email, written and sent from the portal’s mailbox: it is an email by the sender’s choice.' },
  'portal:personal-mail-styles': { emailOnly: 'Not a message: the look of the portal’s mailbox emails.' },
  'portal:layout': { emailOnly: 'Not a message: the shared email layout.' },
  'website:layout': { emailOnly: 'Not a message: the shared email layout.' },
  // Switched off in this edition
  'portal:pricing-alerts-digest': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:pricing-alert-raised': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:part-selling-price-set': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:part-target-margin-set': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:goods-receipt-edited': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:staff-goods-receipt-recorded': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:store-matching-status': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:service-store-matching-status': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:part-request-status': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:service-estimate-part-request-status': { emailOnly: OFF_INVENTORY, off: 'inventory' },
  'portal:external-procurement-status': { emailOnly: OFF_PROCUREMENT, off: 'externalProcurement' },
};

// ── The doc for creating the templates in Meta ───────────────────────

const pipe = (s: string) => s.replace(/\|/g, '\\|');

/** docs/WHATSAPP_TEMPLATES.md, made from the catalogue (a test keeps the file the same). */
export function renderTemplatesDoc(): string {
  const all = WHATSAPP_TEMPLATES as readonly WhatsAppTemplateDef[];
  const out: string[] = [];
  out.push('# WhatsApp templates (D\'Phoenix Autocare)');
  out.push('');
  out.push('<!-- Made from packages/utils/src/whatsapp-templates.ts by `npm run whatsapp:templates-doc`. Do not edit by hand: change the catalogue and run it again. -->');
  out.push('');
  out.push('Every automatic WhatsApp message the portal and the customer portal send. WhatsApp only lets a business start a conversation with a **template Meta has approved**, so each one below must be created in **WhatsApp Manager → Message templates → Create template**, exactly as written: the name, the category, the language, the header, the body (copy it as it is, line breaks included), the footer and a sample for each `{{n}}`. Until a template is approved, its messages are refused by Meta and recorded as failed in **Settings → WhatsApp**; the email still goes.');
  out.push('');
  out.push('- **Language:** English (`en`), unless `WHATSAPP_TEMPLATE_LANGUAGE` says otherwise — create every template in that same language.');
  out.push('- **Header “Document”:** choose *Media → Document* and upload any sample PDF. When the message is sent, the real PDF (the estimate, invoice or receipt) goes in its place, named after its number (for example `INV-2026-000012.pdf`).');
  out.push('- **Samples:** Meta asks for an example of each `{{n}}`; use the ones given. They are made up.');
  out.push('- **Category:** UTILITY for messages about the customer’s own vehicle, job, money or request; MARKETING for announcements (Meta’s rule). Meta may change a category when it reviews a template; that is fine.');
  out.push('- **Replies:** the portal does not read WhatsApp replies; the footer asks people to call. If the business number is also on the WhatsApp Business app (coexistence), replies arrive there.');
  out.push('');
  out.push(`## The ${all.length} templates`);
  out.push('');
  out.push('| Name in Meta | Category | Header | For | When it is sent |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const t of all) out.push(`| \`${t.name}\` | ${t.category} | ${t.header === 'DOCUMENT' ? 'Document (PDF)' : 'None'} | ${t.audience === 'customer' ? 'Customers' : 'Staff'} | ${pipe(t.when)} |`);
  out.push('');
  for (const t of all) {
    out.push(`### \`${t.name}\``);
    out.push('');
    out.push(`- **Category:** ${t.category}`);
    out.push(`- **Language:** English (\`en\`)`);
    out.push(`- **Header:** ${t.header === 'DOCUMENT' ? 'Media → Document (upload any sample PDF)' : 'None'}`);
    out.push(`- **Sent:** ${t.when}`);
    out.push('');
    out.push('**Body**');
    out.push('');
    out.push('```text');
    out.push(t.body);
    out.push('```');
    out.push('');
    out.push(`**Footer:** ${t.footer}`);
    out.push('');
    out.push('| Variable | What it is | Sample |');
    out.push('| --- | --- | --- |');
    t.params.forEach((p, i) => out.push(`| \`{{${i + 1}}}\` | ${p.key === 'name' ? 'Greeting name (a person’s first name, or the organisation’s name)' : p.key === 'workshop' ? 'Your organisation’s name' : pipe(p.key)} | ${pipe(p.example)} |`));
    out.push('');
  }
  out.push('## Emails that stay email-only');
  out.push('');
  out.push('| Email | Why |');
  out.push('| --- | --- |');
  for (const [email, c] of Object.entries(EMAIL_COVERAGE)) {
    if ('emailOnly' in c) out.push(`| \`${email}\` | ${pipe(c.emailOnly)} |`);
  }
  out.push('');
  out.push('## Notes on some emails');
  out.push('');
  for (const [email, c] of Object.entries(EMAIL_COVERAGE)) {
    if ('whatsapp' in c && c.note) out.push(`- \`${email}\` (${c.whatsapp.map((k) => `\`${templateFor(k)!.name}\``).join(', ')}): ${c.note}`);
  }
  out.push('');
  return out.join('\n');
}
