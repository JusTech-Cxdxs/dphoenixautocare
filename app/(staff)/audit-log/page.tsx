import type { Metadata } from 'next';
import { Avatar } from '@/components/Avatar';
import { LoadingLink } from '@/components/LoadingLink';
import { EmptyState, PageHeader, SectionCard, StatusChip, buttonCls, inputCls, labelCls, type Tone } from '@/components/ui';
import { guardPage } from '@/lib/authz/server';
import { prisma } from '@/lib/db';
import { actionLabel } from '@/lib/audit/labels';
import { formatDateTime } from '@/lib/format';
import { KINDS, parseFilters, whereFor } from './query';

export const metadata: Metadata = { title: 'Audit log' };

const PAGE_SIZE = 50;

function tone(action: string): Tone {
  if (action === 'access.denied' || action.endsWith('failed') || action.endsWith('deactivated')) return 'error';
  if (action === 'user.signed_in') return 'success';
  if (action.startsWith('data.')) return 'neutral';
  return 'brand';
}

const SOURCE: Record<string, string> = { auth: 'Sign-in page', app: 'System', seed: 'Set-up script', unattributed: 'System' };

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await guardPage('audit.view', 'audit-log');
  const f = parseFilters(await searchParams);
  const [rows, users] = await Promise.all([
    prisma.auditLog.findMany({ where: whereFor(f), orderBy: { id: 'desc' }, take: PAGE_SIZE + 1 }),
    prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }),
  ]);
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const names = new Map(users.map((u) => [u.id, u.name]));
  const params = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (f.kind !== 'activity') p.set('kind', f.kind);
    if (f.who) p.set('who', f.who);
    if (f.q) p.set('q', f.q);
    if (f.from) p.set('from', f.from);
    if (f.to) p.set('to', f.to);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `/audit-log?${p.toString()}`;
  };

  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader icon="history" title="Audit log" description="Every change, approval, sign-in and refused attempt, newest first. Entries can never be edited or deleted, not even by the Owner." />

      <form method="get" className="mb-6 grid gap-3 rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] p-4 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,1.4fr)_auto] xl:items-end" aria-label="Filter the audit log">
        <div>
          <label htmlFor="kind" className={labelCls}>Show</label>
          <select id="kind" name="kind" defaultValue={f.kind} className={inputCls}>
            {Object.entries(KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="who" className={labelCls}>Who</label>
          <select id="who" name="who" defaultValue={f.who ?? ''} className={inputCls}>
            <option value="">Anyone</option>
            <option value="system">System and sign-in page</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q" className={labelCls}>Search</label>
          <input id="q" name="q" defaultValue={f.q ?? ''} className={inputCls} placeholder="Words or a record number" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="from" className={labelCls}>From</label>
            <input id="from" name="from" type="date" defaultValue={f.from ?? ''} className={inputCls} />
          </div>
          <div>
            <label htmlFor="to" className={labelCls}>To</label>
            <input id="to" name="to" type="date" defaultValue={f.to ?? ''} className={inputCls} />
          </div>
        </div>
        <div className="flex gap-2 md:col-span-2 xl:col-span-1">
          <button type="submit" className={buttonCls('primary')}>Show</button>
          <LoadingLink href="/audit-log" className={buttonCls('ghost')}>Clear</LoadingLink>
        </div>
      </form>

      <SectionCard icon="history" title={`${page.length}${hasMore ? '+' : ''} ${page.length === 1 ? 'entry' : 'entries'}`} description={KINDS[f.kind]} flush>
        {page.length === 0 ? (
          <EmptyState icon="history" title="No entries match">Try a wider date range or show everything.</EmptyState>
        ) : (
          <ol className="divide-y divide-[var(--ejo-border)]" aria-label="Audit entries">
            {page.map((r) => {
              const who = r.userId ? names.get(r.userId) ?? 'Unknown user' : SOURCE[r.source] ?? r.source;
              return (
                <li key={r.id.toString()} className="flex gap-3 px-4 py-3.5 sm:px-5">
                  <Avatar name={who} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <StatusChip tone={tone(r.action)}>{actionLabel(r.action)}</StatusChip>
                        <span className="min-w-0 text-sm font-medium text-[var(--ejo-text)]">{r.summary ?? `${r.entityType.replace(/^db:/, '')}${r.entityId ? ` ${r.entityId}` : ''}`}</span>
                      </div>
                      <time dateTime={r.createdAt.toISOString()} className="shrink-0 text-xs text-[var(--ejo-text-muted)]">{formatDateTime(r.createdAt)}</time>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--ejo-text-muted)]">
                      {who}
                      {r.ipAddress ? ` · ${r.ipAddress}` : ''}
                    </p>
                    {r.metadata ? (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-xs font-semibold text-[var(--ejo-primary-text)]">Details</summary>
                        <pre className="mt-2 max-h-80 overflow-auto rounded-[var(--ejo-radius-md)] bg-[var(--ejo-bg)] p-3 font-mono text-xs text-[var(--ejo-text)] ring-1 ring-[var(--ejo-border)]">{JSON.stringify(r.metadata, null, 2)}</pre>
                      </details>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCard>
      <div className="mt-6 flex justify-between gap-3">
        {f.before !== null ? <LoadingLink href={params({})} className={buttonCls('secondary')}>Newest</LoadingLink> : <span />}
        {hasMore ? <LoadingLink href={params({ before: page[page.length - 1]!.id.toString() })} className={buttonCls('secondary')}>Older entries →</LoadingLink> : null}
      </div>
    </div>
  );
}
