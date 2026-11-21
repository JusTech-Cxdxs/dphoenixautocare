import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, type PrismaClient } from '@prisma/client';

/**
 * The data journal: the low-level audit layer (adapted from EJO 100).
 *
 * Every create, update and delete through the shared Prisma client is written
 * to audit_logs automatically: who (the actor carried through the request),
 * what (model, record, values written and, for updates and deletes, the values
 * before) and when. It sits below every feature, so a forgotten audit call
 * cannot skip it. Business entries ("Job checked in") are written separately
 * by lib/audit/log.ts and are what record timelines show.
 *
 * Safety:
 * - Auth internals and rate-limit counters are not journaled; any field named
 *   like password, token, secret or hash is redacted.
 * - No extra query runs inside a transaction (that would wait on its own
 *   connection). Entries are held and written after COMMIT, and dropped on
 *   rollback, so the journal records what happened, not what was attempted.
 * - Compare-and-set writes (updateMany or deleteMany on one id) keep before
 *   and after values like update and delete. A write that changed nothing is
 *   not journaled.
 * - A journal failure never breaks the operation itself.
 */

export type AuditActor = { userId: string | null; source: string; requestId?: string | null };
type PendingEntry = Prisma.AuditLogCreateManyInput;
type Held = { entry: PendingEntry; tx: symbol | null };
type AuditContext = AuditActor & { pending: Held[]; tx?: symbol | null };

const context = new AsyncLocalStorage<AuditContext>();

/** Records who is acting for the rest of this async context (scheduled jobs, scripts, tests). */
export function setAuditActor(userId: string | null, source: string, requestId: string | null = null): void {
  const existing = context.getStore();
  if (existing && existing.userId === userId && existing.source === source) return;
  context.enterWith({ userId, source, requestId, pending: existing?.pending ?? [], tx: existing?.tx ?? null });
}

/**
 * Finds the acting user when none was recorded in this async context. The app
 * registers a resolver that reads the per-request session (lib/auth/session.ts),
 * because an actor set inside an awaited helper does not flow back to its caller.
 */
let actorResolver: (() => Promise<AuditActor | null>) | null = null;
export function setAuditActorResolver(fn: () => Promise<AuditActor | null>): void {
  actorResolver = fn;
}

async function resolveActor(store: AuditContext | undefined): Promise<AuditActor | null> {
  if (store?.userId) return store;
  if (!actorResolver) return store ?? null;
  try {
    return (await actorResolver()) ?? store ?? null;
  } catch {
    return store ?? null;
  }
}

/** Who is acting in this request. Never call inside a transaction. */
export async function currentAuditActor(): Promise<AuditActor | null> {
  const actor = await resolveActor(context.getStore());
  return actor ? { userId: actor.userId, source: actor.source, requestId: actor.requestId ?? null } : null;
}

/** Models with a single "id" field (UserRole and RolePermission have composite keys). */
const HAS_ID = new Set(Prisma.dmmf.datamodel.models.filter((m) => m.fields.some((f) => f.name === 'id')).map((m) => m.name));

const WRITE_ACTIONS = new Set(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);

/** Models never journaled: auth internals (a Verification value is a live link
 * token), the audit table itself, error records and rate-limit counters. */
export const SKIP_MODELS = new Set(['AuditLog', 'Session', 'Account', 'Verification', 'ErrorEvent', 'RateLimitBucket']);

const SENSITIVE_KEY = /password|token|secret|hash/i;
const MAX_JSON = 6000;

export function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || depth > 6) return value ?? null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    // Prisma Decimal and anything else with toJSON.
    const maybe = value as { toJSON?: () => unknown };
    if (typeof maybe.toJSON === 'function') return redact(maybe.toJSON(), depth + 1);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && /^(reset-password|email-verification|set-password):/i.test(value)) return '[redacted]';
  return value;
}

function capped(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  const safe = redact(value);
  const text = JSON.stringify(safe);
  if (text === undefined) return undefined;
  return (text.length > MAX_JSON ? { truncated: true, preview: text.slice(0, MAX_JSON) } : safe) as Prisma.InputJsonValue;
}

function modelDelegate(client: PrismaClient, model: string): { findUnique?: (a: unknown) => Promise<unknown> } | undefined {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (client as unknown as Record<string, { findUnique?: (a: unknown) => Promise<unknown> }>)[key];
}

/** Only the fields an update touched, before and after. */
function changedFields(before: Record<string, unknown> | null, data: Record<string, unknown> | undefined) {
  if (!before || !data) return { before: before ?? undefined, after: data };
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    b[key] = before[key];
    a[key] = data[key];
  }
  return { before: b, after: a };
}

export function installAuditJournal(client: PrismaClient): void {
  const flag = client as unknown as { __auditJournalInstalled?: boolean };
  if (flag.__auditJournalInstalled) return;
  flag.__auditJournalInstalled = true;

  // Each transaction gets a token: its entries are kept only if it commits.
  const original = client.$transaction.bind(client) as (arg: unknown, options?: unknown) => Promise<unknown>;
  (client as unknown as { $transaction: (arg: unknown, options?: unknown) => Promise<unknown> }).$transaction = (arg: unknown, options?: unknown) => {
    const outer = context.getStore();
    const token = Symbol('tx');
    const begin = (actor: AuditActor | null): AuditContext =>
      outer
        ? { ...outer, ...(actor && !outer.userId ? { userId: actor.userId, source: actor.source, requestId: actor.requestId ?? null } : {}), tx: token }
        : { userId: actor?.userId ?? null, source: actor?.source ?? 'unattributed', requestId: actor?.requestId ?? null, pending: [], tx: token };
    let inner: AuditContext = begin(null);
    const settle = async (committed: boolean) => {
      const list = inner.pending;
      const done: PendingEntry[] = [];
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i]!.tx !== token) continue;
        if (!committed) list.splice(i, 1);
        else if (outer?.tx) list[i]!.tx = outer.tx; // nested: now belongs to the outer transaction
        else done.unshift(list.splice(i, 1)[0]!.entry);
      }
      if (done.length > 0) {
        try {
          await client.auditLog.createMany({ data: done });
        } catch (err) {
          console.error('Audit journal: failed to write committed entries', err);
        }
      }
    };
    // The actor is worked out BEFORE the transaction opens, never inside it.
    return resolveActor(outer)
      .then((actor) => {
        inner = begin(actor);
        return context.run(inner, () => original(arg, options));
      })
      .then(
        async (value) => {
          await settle(true);
          return value;
        },
        async (err) => {
          await settle(false);
          throw err;
        },
      );
  };

  client.$use(async (params, next) => {
    const store = context.getStore();

    // Entries held from a committed transaction are written by the next ordinary query.
    if (store && store.pending.length > 0 && !params.runInTransaction) {
      const batch: PendingEntry[] = [];
      for (let i = store.pending.length - 1; i >= 0; i--) {
        if (store.pending[i]!.tx === null) batch.unshift(store.pending.splice(i, 1)[0]!.entry);
      }
      if (batch.length > 0) {
        try {
          await client.auditLog.createMany({ data: batch });
        } catch (err) {
          console.error('Audit journal: failed to write held entries', err);
        }
      }
    }

    if (!params.model || SKIP_MODELS.has(params.model) || !WRITE_ACTIONS.has(params.action)) {
      return next(params);
    }

    const args = (params.args ?? {}) as { where?: unknown; data?: unknown; create?: unknown; update?: unknown };
    const oneRecord =
      (params.action === 'updateMany' || params.action === 'deleteMany') &&
      Boolean(args.where && typeof args.where === 'object' && typeof (args.where as { id?: unknown }).id === 'string');
    const single = params.action === 'update' || params.action === 'delete' || params.action === 'upsert' || oneRecord;

    // The entry names the record by the id the write returns, so a narrow select still includes it.
    const sel = (params.args as { select?: Record<string, unknown> } | undefined)?.select;
    if (HAS_ID.has(params.model) && (params.action === 'create' || params.action === 'update' || params.action === 'upsert' || params.action === 'delete') && sel && typeof sel === 'object' && !('id' in sel)) {
      (params.args as { select: Record<string, unknown> }).select = { ...sel, id: true };
    }
    const actor = params.runInTransaction ? store ?? null : await resolveActor(store);

    let before: Record<string, unknown> | null = null;
    if (single && args.where && !params.runInTransaction) {
      try {
        const delegate = modelDelegate(client, params.model);
        const where = oneRecord ? { id: (args.where as { id: string }).id } : args.where;
        before = ((await delegate?.findUnique?.({ where })) as Record<string, unknown> | null) ?? null;
      } catch {
        before = null;
      }
    }

    const result = await next(params);

    try {
      const resultId = result && typeof result === 'object' && 'id' in (result as Record<string, unknown>) ? String((result as { id: unknown }).id) : null;
      const whereId = args.where && typeof args.where === 'object' && 'id' in (args.where as Record<string, unknown>) ? String((args.where as { id: unknown }).id) : null;
      let metadata: Record<string, unknown>;
      if (params.action === 'update') {
        metadata = changedFields(before, args.data as Record<string, unknown> | undefined);
      } else if (params.action === 'upsert') {
        metadata = before ? { operation: 'updated', ...changedFields(before, args.update as Record<string, unknown> | undefined) } : { operation: 'created', after: args.create };
      } else if (params.action === 'delete') {
        metadata = { before };
      } else if (params.action === 'create') {
        metadata = { after: args.data };
      } else {
        const count = result && typeof result === 'object' && 'count' in (result as Record<string, unknown>) ? (result as { count: number }).count : undefined;
        if (count === 0) return result;
        metadata =
          oneRecord && params.action === 'updateMany'
            ? { ...changedFields(before, args.data as Record<string, unknown> | undefined), where: args.where, count }
            : oneRecord && params.action === 'deleteMany'
              ? { before, where: args.where, count }
              : { where: args.where, data: args.data, count };
      }
      const entry: PendingEntry = {
        userId: actor?.userId ?? null,
        source: actor?.source ?? 'unattributed',
        requestId: actor?.requestId ?? null,
        action: `data.${params.action}`,
        entityType: `db:${params.model}`,
        entityId: resultId ?? whereId,
        metadata: capped({ ...metadata, ...(params.runInTransaction ? { inTransaction: true } : {}) }),
      };
      if (params.runInTransaction) {
        if (store) store.pending.push({ entry, tx: store.tx ?? null });
        else context.enterWith({ userId: null, source: 'unattributed', pending: [{ entry, tx: null }], tx: null });
      } else {
        await client.auditLog.create({ data: entry });
      }
    } catch (err) {
      console.error('Audit journal: failed to record', params.model, params.action, err);
    }
    return result;
  });
}
