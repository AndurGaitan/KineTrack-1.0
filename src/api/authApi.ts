import { apiFetch } from './client';
import type { User, UserRole } from '../types';

export type AuthResponse = { token: string; user: User };

export function login(input: { email: string; password: string }) {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function me() {
  return apiFetch<{ user: User }>('/api/auth/me');
}

export function updateMe(name: string) {
  return apiFetch<{ user: User }>('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function listUsers() {
  return apiFetch<User[]>('/api/auth/users');
}

export function setUserRole(id: string, role: UserRole) {
  return apiFetch<User>(`/api/auth/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

export function changeMyPassword(input: { currentPassword: string; newPassword: string }) {
  return apiFetch<void>('/api/auth/me/password', { method: 'PATCH', body: JSON.stringify(input) });
}

export type CredentialResponse = { user: User; temporaryPassword: string };

export function createUser(input: { name: string; email: string; role?: UserRole }) {
  return apiFetch<CredentialResponse>('/api/auth/users', { method: 'POST', body: JSON.stringify(input) });
}

export function resetUserPassword(id: string) {
  return apiFetch<CredentialResponse>(`/api/auth/users/${id}/reset-password`, { method: 'POST' });
}
