import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { areaNotAtMyBranch, guardAnyPage } from '@/lib/authz/server';
import { AreaNotHere } from '@/components/AreaNotHere';
import { moduleIsOn } from '@/lib/modules';

/**
 * Server-side guard for /warranty — pasted links included. (Warranty staff, Manager, administrators.)
 * Someone whose own branch has no such area (the menu does not offer it) is
 * told so in place of the page.
 * In an edition with this module off (D'Phoenix Autocare) the whole tree is not found, for everyone.
 */
export default async function Guard({ children }: { children: ReactNode }) {
  if (!moduleIsOn('warranty')) notFound();
  await guardAnyPage(['warranty.view'], '/warranty');
  const elsewhere = await areaNotAtMyBranch('warranty');
  if (elsewhere) return <AreaNotHere area="warranty" {...elsewhere} />;
  return children;
}
