import { describe, expect, it } from 'vitest';

import { addWeeksToIsoDate, getWeekStartIsoDate } from '@/db/repo-helpers';

describe('repo date helpers', () => {
  it('normalizes any day to the Monday of that week in UTC', () => {
    expect(getWeekStartIsoDate(new Date('2026-04-13T18:45:00.000Z'))).toBe('2026-04-13');
    expect(getWeekStartIsoDate(new Date('2026-04-15T18:45:00.000Z'))).toBe('2026-04-13');
    expect(getWeekStartIsoDate(new Date('2026-04-19T18:45:00.000Z'))).toBe('2026-04-13');
  });

  it('adds whole-week offsets to ISO week starts', () => {
    expect(addWeeksToIsoDate('2026-04-13', 0)).toBe('2026-04-13');
    expect(addWeeksToIsoDate('2026-04-13', 1)).toBe('2026-04-20');
    expect(addWeeksToIsoDate('2026-04-13', -1)).toBe('2026-04-06');
  });
});
