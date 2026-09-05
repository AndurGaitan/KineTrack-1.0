import { apiFetch } from './client';
import type { User, UserRole } from '../types';

export type AuthResponse = { token: string; user: User };

export function register(input: { name: string; email: string; password: string }) {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: { email: string; password: string }) {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function me() {
  return apiFetch<{ user: User }>('/api/auth/me');
}

export function listUsers() {
  return apiFetch<User[]>('/api/auth/users');
}

export function setUserRole(id: string, role: UserRole) {
  return apiFetch<User>(`/api/auth/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}
