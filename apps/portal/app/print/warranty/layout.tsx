import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { moduleIsOn } from '@/lib/modules';

/** Printed warranty certificates: Warranty documents, not found where Warranty is switched off (the D'Phoenix Autocare edition). */
export default function WarrantyDocument({ children }: { children: ReactNode }) {
  if (!moduleIsOn('warranty')) notFound();
  return children;
}
