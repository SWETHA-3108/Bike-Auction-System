const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1';

let accessToken: string | null = sessionStorage.getItem('accessToken');
let refreshHandler: (() => Promise<string | null>) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) sessionStorage.setItem('accessToken', token);
  else sessionStorage.removeItem('accessToken');
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshHandler(handler: () => Promise<string | null>) {
  refreshHandler = handler;
}

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data as { error?: { code?: string; message?: string; details?: Record<string, unknown> } };
    throw new ApiClientError(
      err.error?.code ?? 'UNKNOWN',
      err.error?.message ?? 'Request failed',
      res.status,
      err.error?.details
    );
  }
  return data as T;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401 && retry && refreshHandler) {
    const newToken = await refreshHandler();
    if (newToken) return request<T>(path, options, false);
  }

  return parseResponse<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
