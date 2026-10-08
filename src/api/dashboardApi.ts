import { apiFetch } from './client';
import type { DashboardSummary, WeaningTests } from '../types';

export function getDashboardSummary(from: string, to: string) {
  return apiFetch<DashboardSummary>(`/api/dashboard/summary?from=${from}&to=${to}`);
}

/** `from` / `to`: fechas ISO completas (inicio y fin del rango en hora local). */
export function getWeaningTests(from: string, to: string) {
  const qs = new URLSearchParams({ from, to });
  return apiFetch<WeaningTests>(`/api/dashboard/weaning-tests?${qs.toString()}`);
}
