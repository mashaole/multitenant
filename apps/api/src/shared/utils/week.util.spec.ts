import { isoWeekStart } from './week.util';

describe('isoWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date('2026-09-16T12:00:00.000Z');
    expect(isoWeekStart(wed).toISOString().slice(0, 10)).toBe('2026-09-14');
  });

  it('keeps Monday as Monday', () => {
    const mon = new Date('2026-09-14T00:00:00.000Z');
    expect(isoWeekStart(mon).toISOString().slice(0, 10)).toBe('2026-09-14');
  });
});
