import { apiFetch } from './client';
import type { DashboardSummary } from '../types';

export function getDashboardSummary(from: string, to: string) {
  return apiFetch<DashboardSummary>(`/api/dashboard/summary?from=${from}&to=${to}`);
}
