import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Team, Player, PositionBreakdown } from '../types';

export const teamKeys = {
  all: ['teams'] as const,
  list: (groupId?: number) => ['teams', { groupId }] as const,
  detail: (id: number) => ['teams', id] as const,
  players: (id: number) => ['teams', id, 'players'] as const,
  breakdown: (id: number) => ['teams', id, 'breakdown'] as const,
};

export function useTeams(groupId?: number) {
  return useQuery({
    queryKey: teamKeys.list(groupId),
    queryFn: () => {
      const qs = groupId ? `?group_id=${groupId}` : '';
      return apiFetch<Team[]>(`/teams${qs}`);
    },
  });
}

export function useTeamPlayers(teamId: number) {
  return useQuery({
    queryKey: teamKeys.players(teamId),
    queryFn: () => apiFetch<Player[]>(`/teams/${teamId}/players`),
  });
}

export function useTeamBreakdown(teamId: number) {
  return useQuery({
    queryKey: teamKeys.breakdown(teamId),
    queryFn: () => apiFetch<PositionBreakdown>(`/teams/${teamId}/breakdown`),
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null; group_id: number }) =>
      apiFetch<Team>('/teams', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description?: string | null; group_id: number }) =>
      apiFetch<Team>(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.all }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/teams/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.all });
      qc.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
