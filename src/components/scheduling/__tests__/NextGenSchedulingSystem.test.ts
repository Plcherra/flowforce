import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDailyHoursLabel } from '../NextGenSchedulingSystem';

describe('formatDailyHoursLabel', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('formats the correct day label for PST users without shifting a day backwards', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles');
    const result = formatDailyHoursLabel('2024-01-08');
    expect(result).toBe('Mon, Jan 8');
  });

  it('returns the original value when the input is not a valid ISO date', () => {
    const malformed = formatDailyHoursLabel('not-a-date');
    expect(malformed).toBe('not-a-date');
  });
});
