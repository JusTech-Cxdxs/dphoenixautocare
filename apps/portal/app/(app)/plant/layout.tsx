import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { moduleIsOn } from '@/lib/modules';

/**
 * Edition guard for /plant, the assembly plant.
 * In an edition with this module off (D'Phoenix Autocare) the whole tree is not found, for everyone;
 * each page still checks the person's permissions as before.
 */
export default function Guard({ children }: { children: ReactNode }) {
  if (!moduleIsOn('plant')) notFound();
  return children;
}
