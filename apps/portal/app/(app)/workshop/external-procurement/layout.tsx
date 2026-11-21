import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { featureOn } from '@/lib/modules';

/** External procurement (EPR) approvals: not found where they are switched off (the D'Phoenix Autocare edition prices parts bought outside on the estimate), pasted links included. */
export default function ProcurementOnly({ children }: { children: ReactNode }) {
  if (!featureOn('externalProcurement')) notFound();
  return children;
}
