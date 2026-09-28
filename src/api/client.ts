const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_STORAGE_KEY = 'kinetrack-token';

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// A 401 while we DID send a token means the session died mid-use (expired,
// or invalidated — e.g. a coordinador reset that user's password). Distinct
// from a 401 on /auth/login (no token attached), which just means wrong
// credentials and must stay on the login form to show that message.
// `redirecting` guards against the burst of concurrent requests the app
// fires on load all trying to redirect at once.
let redirecting = false;
function handleSessionExpired(): void {
  if (redirecting) return;
  redirecting = true;
  clearToken();
  window.location.href = '/?sessionExpired=1';
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    if (token && res.status === 401) {
      handleSessionExpired();
    }

    const text = await res.text();
    let message = text || `Error ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || message;
    } catch {
      // response wasn't JSON, keep the raw text
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}
