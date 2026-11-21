import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { featureOn } from '@/lib/modules';

/**
 * Edition guard for /support/speak-up.
 * In an edition without it (D'Phoenix Autocare, lib/modules.ts) the page is not found, for everyone —
 * pasted links included; each page still checks the person's permissions as before.
 */
export default function Guard({ children }: { children: ReactNode }) {
  if (!featureOn('speakUp')) notFound();
  return children;
}
