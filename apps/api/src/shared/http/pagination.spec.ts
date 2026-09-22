import { slicePage, toPage } from './pagination';

describe('toPage', () => {
  it('defaults to page 1 limit 20', () => {
    expect(toPage()).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it('caps limit at 100', () => {
    expect(toPage(1, 500).take).toBe(100);
  });

  it('computes skip in O(1)', () => {
    expect(toPage(3, 10)).toEqual({ page: 3, limit: 10, skip: 20, take: 10 });
  });
});

describe('slicePage', () => {
  it('returns the requested window and total', () => {
    const rows = ['a', 'b', 'c', 'd'];
    expect(slicePage(rows, 2, 2)).toEqual({
      items: ['c', 'd'],
      page: 2,
      limit: 2,
      total: 4,
    });
  });
});
