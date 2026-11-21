import type { Metadata } from 'next';
import { EmptyState, HeaderAction } from '@/components/ui';

export const metadata: Metadata = { title: 'No access' };

export default async function AccessDeniedPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  return (
    <div className="w-full p-4 sm:p-8">
      <div className="mx-auto mt-6 max-w-lg rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)]">
        <EmptyState icon="lock" title="You do not have access to this page" action={<HeaderAction href="/dashboard" icon="dashboard">Go to the dashboard</HeaderAction>}>
          {area ? `It needs permission to: ${area.slice(0, 160)}.` : 'Your role does not include this page.'} If you need it, please ask the Owner.
        </EmptyState>
      </div>
    </div>
  );
}
