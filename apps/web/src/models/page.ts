export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function pagePath(
  path: string,
  page: number,
  extra: Record<string, string | number | undefined> = {},
  limit = 20,
): string {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return `${path}?${params.toString()}`;
}
