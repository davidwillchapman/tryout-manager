import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Group, Team, PositionBreakdown } from '../types';

export const groupKeys = {
  all: ['groups'] as const,
  detail: (id: number) => ['groups', id] as const,
  teams: (id: number) => ['groups', id, 'teams'] as const,
  players: (id: number) => ['groups', id, 'players'] as const,
  breakdown: (id: number) => ['groups', id, 'breakdown'] as const,
};

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.all,
    queryFn: () => apiFetch<Group[]>('/groups'),
  });
}

export function useGroupTeams(groupId: number) {
  return useQuery({
    queryKey: groupKeys.teams(groupId),
    queryFn: () => apiFetch<Team[]>(`/groups/${groupId}/teams`),
  });
}

export function useGroupPlayers(groupId: number) {
  return useQuery({
    queryKey: groupKeys.players(groupId),
    queryFn: () => apiFetch<import('../types').Player[]>(`/groups/${groupId}/players`),
  });
}

export function useGroupBreakdown(groupId: number) {
  return useQuery({
    queryKey: groupKeys.breakdown(groupId),
    queryFn: () => apiFetch<PositionBreakdown>(`/groups/${groupId}/breakdown`),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null }) =>
      apiFetch<Group>('/groups', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description?: string | null }) =>
      apiFetch<Group>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKeys.all });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
