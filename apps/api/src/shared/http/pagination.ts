export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

/** Time: O(1) | Space: O(1) */
export function toPage(
  page?: number,
  limit?: number,
): { page: number; limit: number; skip: number; take: number } {
  const nextPage = Math.max(DEFAULT_PAGE, page ?? DEFAULT_PAGE);
  const nextLimit = Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT));
  return {
    page: nextPage,
    limit: nextLimit,
    skip: (nextPage - 1) * nextLimit,
    take: nextLimit,
  };
}

export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PageResult<T> {
  return { items, page, limit, total };
}

/** Time: O(k) where k = take | Space: O(k) */
export function slicePage<T>(
  rows: T[],
  page?: number,
  limit?: number,
): PageResult<T> {
  const args = toPage(page, limit);
  return paginate(rows.slice(args.skip, args.skip + args.take), rows.length, args.page, args.limit);
}
