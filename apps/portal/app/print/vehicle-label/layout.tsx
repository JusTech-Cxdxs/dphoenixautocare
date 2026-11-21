import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { moduleIsOn } from '@/lib/modules';

/** Printed windscreen and door-jamb labels: assembly-plant documents (vehicles.label.print), not found where the plant is switched off (the D'Phoenix Autocare edition). */
export default function PlantDocument({ children }: { children: ReactNode }) {
  if (!moduleIsOn('plant')) notFound();
  return children;
}
