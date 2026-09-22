const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface ApiError {
  code: string;
  message: string;
  details?: { field?: string };
}

export async function api<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body.error ?? { code: 'INTERNAL', message: 'Request failed' };
    throw err as ApiError;
  }
  return body as T;
}
