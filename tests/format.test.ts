import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatPhone, lagosHour, phoneDigits } from '@/lib/format';

describe('display formats', () => {
  it('shows dates as DD/MM/YYYY in Lagos time', () => {
    // 23:30 UTC on the 20th is 00:30 on the 21st in Lagos.
    expect(formatDate('2026-11-20T23:30:00Z')).toBe('21/11/2026');
    expect(formatDateTime('2026-11-21T08:05:00Z')).toBe('21/11/2026, 9:05 AM');
    expect(lagosHour('2026-11-21T23:30:00Z')).toBe(0);
  });

  it('normalises Nigerian phone numbers to 234 format', () => {
    expect(phoneDigits('0803 123 4567')).toBe('2348031234567');
    expect(phoneDigits('+234 803 123 4567')).toBe('2348031234567');
    expect(phoneDigits('234 0803 123 4567')).toBe('2348031234567');
    expect(phoneDigits('8031234567')).toBe('2348031234567');
    expect(phoneDigits('abc')).toBeNull();
    expect(phoneDigits('')).toBeNull();
    expect(formatPhone('08031234567')).toBe('+234 803 123 4567');
  });
});
