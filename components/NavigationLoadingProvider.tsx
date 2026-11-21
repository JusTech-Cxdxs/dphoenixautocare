'use client';

import { createContext, useContext, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Ctx = { isPending: boolean; navigate: (href: string) => void };
const NavigationLoadingContext = createContext<Ctx | null>(null);

/**
 * Shows the loader over the working area for every navigation made through
 * <LoadingLink> (from EJO 100). The menu and header stay in place.
 */
export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = (href: string) => startTransition(() => router.push(href));
  return (
    <NavigationLoadingContext.Provider value={{ isPending, navigate }}>
      <div className="ejo-page relative min-w-0 flex-1">
        {isPending ? (
          <div className="ejo-fade absolute inset-0 z-10 flex items-start justify-center bg-[var(--ejo-bg)]/80 pt-32 backdrop-blur-[1px]" role="status" aria-live="polite">
            <span className="relative flex h-16 w-16 items-center justify-center">
              <span className="ejo-spin absolute inset-0 rounded-full border-2 border-dashed border-[var(--ejo-primary)]/50" aria-hidden="true" />
              <span className="ejo-glow absolute inset-2 rounded-full bg-[var(--ejo-primary)]/40 blur-md" aria-hidden="true" />
              <span className="sr-only">Loading…</span>
            </span>
          </div>
        ) : null}
        {children}
      </div>
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading(): Ctx | null {
  return useContext(NavigationLoadingContext);
}
