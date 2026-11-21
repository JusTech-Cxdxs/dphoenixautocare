import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { featureOn } from '@/lib/modules';

/** Printed external procurement requests (EPR): not found where those approvals are switched off (the D'Phoenix Autocare edition). */
export default function ProcurementDocument({ children }: { children: ReactNode }) {
  if (!featureOn('externalProcurement')) notFound();
  return children;
}
