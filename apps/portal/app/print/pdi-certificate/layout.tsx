import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { moduleIsOn } from '@/lib/modules';

/** Printed PDI certificates: assembly-plant documents, not found where the plant is switched off (the D'Phoenix Autocare edition). */
export default function PlantDocument({ children }: { children: ReactNode }) {
  if (!moduleIsOn('plant')) notFound();
  return children;
}
