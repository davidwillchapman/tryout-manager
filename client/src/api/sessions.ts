import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { SessionPlan, SessionPlanDetail, SessionActivity } from '../types';

export const sessionKeys = {
  all: ['sessions'] as const,
  detail: (id: number) => ['sessions', id] as const,
};

export function useSessions() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: () => apiFetch<SessionPlan[]>('/sessions'),
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: sessionKeys.detail(id),
    queryFn: () => apiFetch<SessionPlanDetail>(`/sessions/${id}`),
    enabled: !!id,
  });
}

type SessionBody = Omit<SessionPlan, 'id' | 'activity_count' | 'created_at' | 'updated_at'>;

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SessionBody) =>
      apiFetch<SessionPlan>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & SessionBody) =>
      apiFetch<SessionPlan>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: sessionKeys.all });
      qc.invalidateQueries({ queryKey: sessionKeys.detail(id) });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export function useAddActivityToSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, activity_id }: { sessionId: number; activity_id: number }) =>
      apiFetch<SessionActivity>(`/sessions/${sessionId}/activities`, {
        method: 'POST',
        body: JSON.stringify({ activity_id }),
      }),
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      qc.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useRemoveActivityFromSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, saId }: { sessionId: number; saId: number }) =>
      apiFetch<void>(`/sessions/${sessionId}/activities/${saId}`, { method: 'DELETE' }),
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      qc.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useReorderSessionActivities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, order }: { sessionId: number; order: number[] }) =>
      apiFetch<void>(`/sessions/${sessionId}/activities/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ order }),
      }),
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
    },
  });
}

export function usePatchSessionActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, saId, activity_id }: { sessionId: number; saId: number; activity_id: number }) =>
      apiFetch<SessionActivity>(`/sessions/${sessionId}/activities/${saId}`, {
        method: 'PATCH',
        body: JSON.stringify({ activity_id }),
      }),
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      qc.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}
