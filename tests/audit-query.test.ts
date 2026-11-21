import { describe, expect, it } from 'vitest';
import { lagosMidnight, parseFilters, whereFor } from '@/app/(staff)/audit-log/query';

describe('audit log filters', () => {
  it('ignores bad input instead of failing', () => {
    const f = parseFilters({ kind: 'drop table', from: '21/11/2026', before: '1; DROP' });
    expect(f.kind).toBe('activity');
    expect(f.from).toBeNull();
    expect(f.before).toBeNull();
  });

  it('turns Lagos dates into the right UTC range', () => {
    expect(lagosMidnight('2026-11-21').toISOString()).toBe('2026-11-20T23:00:00.000Z');
    expect(lagosMidnight('2026-11-21', 1).toISOString()).toBe('2026-11-21T23:00:00.000Z');
  });

  it('builds a where clause for each filter', () => {
    const w = whereFor(parseFilters({ kind: 'denied', who: 'system', q: 'staff', from: '2026-11-01', to: '2026-11-21', before: '500' }));
    const json = JSON.stringify(w, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
    expect(json).toContain('access.denied');
    expect(json).toContain('"userId":null');
    expect(json).toContain('"lt":"500"');
    expect(json).toContain('staff');
  });
});
