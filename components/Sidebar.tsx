'use client';

import { usePathname } from 'next/navigation';
import { LoadingLink } from './LoadingLink';
import { Wordmark } from './Wordmark';
import { PoweredByEjo } from './PoweredByEjo';
import { Icon } from './ui/Icon';
import type { NavItem } from '@/lib/navigation';

const GROUPS: NavItem['group'][] = ['Overview', 'Operations', 'Administration'];

/**
 * The menu (EJO 100's Sidebar): the modules THIS person may open, worked out
 * on the server from their role (every page still checks again). Grouped,
 * with icons; on desktops it folds to icons only (remembered on this browser);
 * on phones and tablets it is the slide-in drawer.
 */
export function Sidebar({ items, collapsed = false, onToggleCollapse, onNavigate, variant = 'desktop' }: { items: NavItem[]; collapsed?: boolean; onToggleCollapse?: () => void; onNavigate?: () => void; variant?: 'desktop' | 'drawer' }) {
  const pathname = usePathname();
  const mini = collapsed && variant === 'desktop';
  const linkBase = 'group relative flex items-center rounded-[var(--ejo-radius-md)] text-sm font-medium transition-colors';
  const groups = GROUPS.map((g) => ({ title: g, items: items.filter((i) => i.group === g) })).filter((g) => g.items.length > 0);

  return (
    <aside className={`flex h-full flex-col border-r border-[var(--ejo-border)] bg-[var(--ejo-surface)] transition-[width] duration-200 ${mini ? 'w-[76px]' : 'w-72 lg:w-64'}`}>
      <div className={`flex h-16 shrink-0 items-center border-b border-[var(--ejo-border)] ${mini ? 'justify-center px-2' : 'justify-between gap-2 px-4'}`}>
        {mini ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/logo.png" alt="D'Phoenix Autocare" width={36} height={36} className="h-9 w-9 object-contain" />
        ) : (
          <LoadingLink href="/dashboard" onClick={onNavigate} className="min-w-0">
            <Wordmark />
          </LoadingLink>
        )}
        {variant === 'drawer' ? (
          <button type="button" onClick={onNavigate} aria-label="Close menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ejo-text-muted)] hover:bg-[var(--ejo-bg)] hover:text-[var(--ejo-text)]">
            <Icon name="close" size={18} />
          </button>
        ) : null}
      </div>

      <nav aria-label="Main" className={`ejo-scroll flex-1 overflow-y-auto overscroll-contain py-3 ${mini ? 'px-2' : 'px-3'}`}>
        {groups.map((g) => (
          <div key={g.title} className="mb-3">
            {mini ? (
              <div className="mx-3 mb-2 mt-1 h-px bg-[var(--ejo-border)] first:hidden" aria-hidden="true" />
            ) : (
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ejo-text-muted)]">{g.title}</p>
            )}
            <div className="space-y-0.5">
              {g.items.map((mod) => {
                const active = pathname === mod.href || pathname.startsWith(`${mod.href}/`);
                return (
                  <LoadingLink
                    key={mod.key}
                    href={mod.href}
                    onClick={onNavigate}
                    title={mini ? mod.name : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`${linkBase} ${mini ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2'} ${active ? 'bg-[var(--ejo-primary)]/14 text-[var(--ejo-text)]' : 'text-[var(--ejo-text-muted)] hover:bg-[var(--ejo-bg)] hover:text-[var(--ejo-text)]'}`}
                  >
                    {active ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--ejo-primary)]" aria-hidden="true" /> : null}
                    <span className={`flex shrink-0 items-center justify-center transition-transform group-hover:scale-110 ${active ? 'text-[var(--ejo-primary-text)]' : ''}`}>
                      <Icon name={mod.icon} size={mini ? 20 : 18} />
                    </span>
                    <span className={mini ? 'sr-only' : 'min-w-0 flex-1 truncate'}>{mod.name}</span>
                  </LoadingLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-[var(--ejo-border)] ${mini ? 'flex flex-col items-center gap-2 px-2 py-3' : 'flex items-center justify-between gap-2 px-4 py-3'}`}>
        {mini ? null : <PoweredByEjo />}
        {variant === 'desktop' && onToggleCollapse ? (
          <button type="button" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand the menu' : 'Collapse the menu'} title={collapsed ? 'Expand the menu' : 'Collapse the menu'} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--ejo-text-muted)] transition-colors hover:bg-[var(--ejo-bg)] hover:text-[var(--ejo-primary-text)]">
            <span className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}>
              <Icon name="chevron-left" size={16} />
            </span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
