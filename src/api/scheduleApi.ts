import { apiFetch } from './client';
import type { ShiftAssignment, ShiftTemplate, ShiftTemplateSlot } from '../types';

export function listShiftTemplates() {
  return apiFetch<ShiftTemplate[]>('/api/schedule/templates');
}

export function createShiftTemplate(input: {
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slots: ShiftTemplateSlot[];
}) {
  return apiFetch<ShiftTemplate>('/api/schedule/templates', { method: 'POST', body: JSON.stringify(input) });
}

export function updateShiftTemplate(
  id: string,
  input: Partial<{ name: string; daysOfWeek: number[]; startTime: string; endTime: string; active: boolean; slots: ShiftTemplateSlot[] }>
) {
  return apiFetch<ShiftTemplate>(`/api/schedule/templates/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function generateMonth(year: number, month: number) {
  return apiFetch<{ created: number; totalSlotsForMonth: number }>('/api/schedule/generate-month', {
    method: 'POST',
    body: JSON.stringify({ year, month }),
  });
}

export function listAssignments(from: string, to: string) {
  return apiFetch<ShiftAssignment[]>(`/api/schedule/assignments?from=${from}&to=${to}`);
}

export function assignSlot(id: string, userId: string | null) {
  return apiFetch<ShiftAssignment>(`/api/schedule/assignments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ userId }),
  });
}
