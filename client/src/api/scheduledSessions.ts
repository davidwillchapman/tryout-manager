import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  ScheduledSession,
  ScheduledSessionSummary,
  ScheduledSessionActivity,
  ScheduledSessionPlayer,
  AttendanceStatus,
  EvalMark,
} from '../types';

export const scheduledSessionKeys = {
  team: (teamId: number) => ['scheduled-sessions', 'team', teamId] as const,
  detail: (id: number) => ['scheduled-sessions', id] as const,
};

export function useScheduledSessions(teamId: number) {
  return useQuery({
    queryKey: scheduledSessionKeys.team(teamId),
    queryFn: () => apiFetch<ScheduledSessionSummary[]>(`/scheduled-sessions/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export function useScheduledSession(id: number | null) {
  return useQuery({
    queryKey: scheduledSessionKeys.detail(id ?? 0),
    queryFn: () => apiFetch<ScheduledSession>(`/scheduled-sessions/${id}`),
    enabled: !!id,
  });
}

export function useCreateScheduledSession(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { source_session_id: number; date: string }) =>
      apiFetch<ScheduledSession>(`/scheduled-sessions/teams/${teamId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduledSessionKeys.team(teamId) }),
  });
}

type PatchSessionBody = Partial<{
  date: string;
  title: string;
  game_phase: string;
  overall_objective: string;
  main_principle: string | null;
  sub_principle_1: string | null;
  sub_principle_2: string | null;
  evaluation_status: string;
  overall_rating: number | null;
  evaluation_notes: string | null;
}>;

export function useUpdateScheduledSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & PatchSessionBody) =>
      apiFetch<ScheduledSession>(`/scheduled-sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: scheduledSessionKeys.detail(id) });
    },
  });
}

export function useDeleteScheduledSession(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/scheduled-sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduledSessionKeys.team(teamId) }),
  });
}

type PatchActivityBody = Partial<{
  rating: number | null;
  notes: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  activity_type: string | null;
  duration_minutes: number | null;
  field_setup: string | null;
  coaching_points: string | null;
  flexibility_notes: string | null;
}>;

export function useUpdateScheduledActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, activityId, ...data }: { sessionId: number; activityId: number } & PatchActivityBody) =>
      apiFetch<ScheduledSessionActivity>(`/scheduled-sessions/${sessionId}/activities/${activityId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { sessionId }) => {
      qc.invalidateQueries({ queryKey: scheduledSessionKeys.detail(sessionId) });
    },
  });
}

export function useAddScheduledPlayer(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<ScheduledSessionPlayer>(`/scheduled-sessions/${sessionId}/players`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduledSessionKeys.detail(sessionId) }),
  });
}

export function useUpdateScheduledPlayer(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowId,
      attendance,
      eval_mark,
    }: {
      rowId: number;
      attendance?: AttendanceStatus | null;
      eval_mark?: EvalMark | null;
    }) =>
      apiFetch<ScheduledSessionPlayer>(`/scheduled-sessions/${sessionId}/players/${rowId}`, {
        method: 'PATCH',
        body: JSON.stringify({ attendance, eval_mark }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduledSessionKeys.detail(sessionId) }),
  });
}

export function useRemoveScheduledPlayer(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rowId: number) =>
      apiFetch<void>(`/scheduled-sessions/${sessionId}/players/${rowId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduledSessionKeys.detail(sessionId) }),
  });
}
