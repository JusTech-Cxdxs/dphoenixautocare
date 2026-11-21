'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { connectChangePings } from '@/lib/realtime/client';

const FALLBACK_POLL_MS = 20_000;
const LABEL = { push: 'Live', polling: 'Auto-updating', offline: 'Offline' } as const;
const DOT = { push: 'bg-[var(--ejo-success)]', polling: 'bg-[var(--ejo-warning)]', offline: 'bg-[var(--ejo-error)]' } as const;
const HINT = {
  push: 'Instant updates are on: changes appear within about a second.',
  polling: 'Checks for changes every 20 seconds while you use the page.',
  offline: 'No connection. Reconnecting; everything will catch up automatically.',
} as const;

/** Someone is typing: a refresh now could disturb them, so wait for the next change. */
function busyTyping(): boolean {
  const el = document.activeElement;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable));
}

/**
 * Keeps open pages up to date and shows whether they are (EJO 100's pill).
 * With Supabase Realtime a ping arrives the moment anything changes; otherwise
 * the page checks every 20 seconds. It refreshes only when the pulse changed.
 * Mounted once, in the header.
 */
export function LiveStatus() {
  const router = useRouter();
  const [mode, setMode] = useState<'push' | 'polling' | 'offline'>('polling');
  const last = useRef<string | null>(null);

  const check = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const res = await fetch('/api/live/pulse', { cache: 'no-store' });
      if (res.status === 401) return router.refresh();
      if (!res.ok) return setMode('offline');
      const { pulse } = (await res.json()) as { pulse: string };
      if (last.current !== null && pulse !== last.current && !busyTyping()) router.refresh();
      last.current = pulse;
      setMode((m) => (m === 'offline' ? 'polling' : m));
    } catch {
      setMode('offline');
    }
  }, [router]);

  useEffect(() => {
    void check();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const stop = url && anonKey && typeof WebSocket !== 'undefined' ? connectChangePings({ url, anonKey, onPing: () => void check(), onState: (c) => setMode(c ? 'push' : 'polling') }) : null;
    const timer = setInterval(() => void check(), FALLBACK_POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop?.();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  return (
    <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--ejo-border)] px-1.5 py-1 text-[11px] text-[var(--ejo-text-muted)] md:inline-flex xl:px-2 xl:py-0.5" title={HINT[mode]}>
      <span className={`h-2 w-2 rounded-full ${DOT[mode]} ${mode !== 'offline' ? 'animate-pulse' : ''}`} />
      <span className="sr-only xl:not-sr-only">{LABEL[mode]}</span>
    </span>
  );
}
