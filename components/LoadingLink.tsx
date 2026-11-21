'use client';

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useNavigationLoading } from './NavigationLoadingProvider';

/**
 * Use instead of next/link for internal links so every navigation shows the
 * loader (from EJO 100). A normal <a href>, so new tab and copy link still
 * work; only a plain left-click is intercepted. Outside the signed-in shell it
 * behaves as a plain link.
 */
export function LoadingLink({ href, children, className, ...rest }: { href: string; children: ReactNode; className?: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>) {
  const nav = useNavigationLoading();
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    rest.onClick?.(e);
    if (!nav || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    nav.navigate(href);
  }
  return (
    <a href={href} {...rest} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
