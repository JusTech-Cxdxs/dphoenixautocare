import type { Metadata } from 'next';
import { Avatar } from '@/components/Avatar';
import { LoadingLink } from '@/components/LoadingLink';
import { EmptyState, PageHeader, SectionCard, StatusChip, buttonCls, inputCls } from '@/components/ui';
import { guardPage } from '@/lib/authz/server';
import { prisma } from '@/lib/db';
import { formatPhone, phoneDigits } from '@/lib/format';

export const metadata: Metadata = { title: 'Search' };

/**
 * The search behind the header's search box. It covers what exists so far
 * (staff); customers, vehicles, plates and job numbers join it phase by phase.
 */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await guardPage('staff.view', 'search');
  const q = (await searchParams).q?.trim().slice(0, 80) ?? '';
  const digits = phoneDigits(q);
  const staff =
    q.length >= 2
      ? await prisma.staff.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { roleTitle: { contains: q, mode: 'insensitive' } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
              { phone: { contains: q } },
              ...(digits ? [{ phone: { contains: digits.slice(-10) } }] : []),
            ],
          },
          orderBy: [{ active: 'desc' }, { name: 'asc' }],
          take: 25,
          select: { id: true, name: true, roleTitle: true, phone: true, active: true, user: { select: { email: true } } },
        })
      : [];

  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader icon="search" title="Search" description="Find anyone by name, job title, phone or email." />
      <form method="get" role="search" className="mb-6 flex gap-2">
        <label htmlFor="search-q" className="sr-only">Search</label>
        <input id="search-q" name="q" type="search" defaultValue={q} autoFocus placeholder="Type at least two letters…" className={inputCls} />
        <button type="submit" className={buttonCls('primary')}>Search</button>
      </form>
      {q.length < 2 ? null : (
        <SectionCard icon="users" title={staff.length === 1 ? '1 person' : `${staff.length} people`} flush>
          {staff.length === 0 ? (
            <EmptyState icon="search" title={`Nothing matches “${q}”`}>Check the spelling, or try part of the name or phone number.</EmptyState>
          ) : (
            <ul className="divide-y divide-[var(--ejo-border)]">
              {staff.map((s) => (
                <li key={s.id}>
                  <LoadingLink href={`/staff/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--ejo-bg)] sm:px-5">
                    <Avatar name={s.name} size={36} active={s.active} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--ejo-text)]">{s.name}</span>
                      <span className="block truncate text-xs text-[var(--ejo-text-muted)]">
                        {s.roleTitle}
                        {s.phone ? ` · ${formatPhone(s.phone)}` : ''}
                        {s.user ? ` · ${s.user.email}` : ''}
                      </span>
                    </span>
                    <StatusChip tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Switched off'}</StatusChip>
                  </LoadingLink>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
    </div>
  );
}
