'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { LiveStatus } from './LiveStatus';
import { ThemeToggle } from './ThemeToggle';
import { Avatar } from './Avatar';
import { Wordmark } from './Wordmark';
import { LoadingLink } from './LoadingLink';
import { Icon } from './ui/Icon';

/**
 * The sticky header (EJO 100's Topbar): menu button and wordmark on phones,
 * the search front and centre, live status, theme and the person's own menu.
 */
export function Topbar({ userName, roleName, canSearch, onMenu, menuOpen = false }: { userName: string; roleName: string; canSearch: boolean; onMenu: () => void; menuOpen?: boolean }) {
  const router = useRouter();
  const [account, setAccount] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    setLeaving(true);
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  useEffect(() => {
    if (!account) return;
    const outside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccount(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAccount(false);
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [account]);

  return (
    <header className="relative z-40 box-content flex h-16 shrink-0 items-center gap-2 border-b border-[var(--ejo-border)] bg-[color-mix(in_srgb,var(--ejo-bg)_93%,var(--ejo-primary))] px-3 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-5">
      <button type="button" onClick={onMenu} aria-label="Open menu" aria-expanded={menuOpen} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ejo-text)] transition-colors hover:bg-[var(--ejo-surface)] lg:hidden">
        <Icon name="menu" size={20} />
      </button>
      <LoadingLink href="/dashboard" className="flex min-w-0 shrink items-center lg:hidden">
        <Wordmark size="sm" />
      </LoadingLink>

      <div className="flex min-w-0 flex-1 justify-end md:justify-center">
        {canSearch ? (
          <form action="/search" method="get" role="search" className="hidden w-full max-w-xl md:block">
            <label className="relative block">
              <span className="sr-only">Search</span>
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--ejo-text-muted)]"><Icon name="search" size={17} /></span>
              <input name="q" type="search" placeholder="Search anything: a name, a phone, an email…" className="h-10 w-full rounded-full border border-[var(--ejo-border)] bg-[var(--ejo-bg)] pl-10 pr-4 text-sm text-[var(--ejo-text)] outline-none placeholder:text-[var(--ejo-text-muted)] focus:border-[var(--ejo-primary)] focus:ring-2 focus:ring-[var(--ejo-primary)]/25" />
            </label>
          </form>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LiveStatus />
        {canSearch ? (
          <LoadingLink href="/search" aria-label="Search" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--ejo-text-muted)] hover:bg-[var(--ejo-surface)] hover:text-[var(--ejo-primary-text)] md:hidden">
            <Icon name="search" size={19} />
          </LoadingLink>
        ) : null}
        <span className="hidden sm:inline-flex">
          <ThemeToggle />
        </span>

        <div ref={accountRef} className="relative">
          <button type="button" onClick={() => setAccount((v) => !v)} aria-expanded={account} aria-haspopup="true" className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-[var(--ejo-surface)] md:pr-2">
            <span className="sr-only">Account menu</span>
            <Avatar name={userName} size={32} />
            <span className="hidden max-w-[11rem] text-left text-sm leading-tight xl:block">
              <span className="block truncate font-medium text-[var(--ejo-text)]">{userName}</span>
              <span className="block truncate text-xs text-[var(--ejo-text-muted)]">{roleName}</span>
            </span>
            <span className={`hidden text-[var(--ejo-text-muted)] transition-transform md:inline ${account ? 'rotate-180' : ''}`} aria-hidden="true">
              <Icon name="chevron-down" size={14} />
            </span>
          </button>
          {account ? (
            <div className="ejo-pop fixed inset-x-2 top-[calc(4rem+env(safe-area-inset-top))] z-50 overflow-hidden rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] shadow-2xl shadow-black/10 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72">
              <div className="flex items-center gap-3 border-b border-[var(--ejo-border)] bg-[var(--ejo-bg)] p-4">
                <Avatar name={userName} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--ejo-text)]">{userName}</p>
                  <p className="truncate text-xs text-[var(--ejo-text-muted)]">{roleName}</p>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ejo-text-muted)]">Appearance</p>
                <ThemeToggle variant="segmented" />
              </div>
              <div className="border-t border-[var(--ejo-border)] p-1.5">
                <button type="button" onClick={handleSignOut} disabled={leaving} className="flex w-full items-center gap-3 rounded-[var(--ejo-radius-md)] px-3 py-2 text-left text-sm text-[var(--ejo-error)] hover:bg-[var(--ejo-error)]/5">
                  <Icon name="logout" size={17} />
                  {leaving ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <button type="button" onClick={handleSignOut} disabled={leaving} aria-label="Sign out" title="Sign out" className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[var(--ejo-text-muted)] transition-colors hover:bg-[var(--ejo-error)]/8 hover:text-[var(--ejo-error)] lg:inline-flex">
          <Icon name="logout" size={16} />
          <span className="hidden 2xl:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
