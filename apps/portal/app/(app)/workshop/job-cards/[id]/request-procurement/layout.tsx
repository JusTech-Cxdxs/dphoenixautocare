import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { featureOn } from '@/lib/modules';

/** Raising an external procurement request (EPR) on a Job Card: not found where those approvals are switched off (the D'Phoenix Autocare edition). */
export default function ProcurementOnly({ children }: { children: ReactNode }) {
  if (!featureOn('externalProcurement')) notFound();
  return children;
}
