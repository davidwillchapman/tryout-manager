import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Player } from '../types';

export const playerKeys = {
  all: ['players'] as const,
  list: (filters: Record<string, string | undefined>) => ['players', filters] as const,
  detail: (id: number) => ['players', id] as const,
};

interface PlayerFilters {
  search?: string;
  position?: string;
  group_id?: string;
  team_id?: string;
}

export function usePlayers(filters: PlayerFilters = {}) {
  return useQuery({
    queryKey: playerKeys.list(filters as Record<string, string | undefined>),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.position) params.set('position', filters.position);
      if (filters.group_id) params.set('group_id', filters.group_id);
      if (filters.team_id) params.set('team_id', filters.team_id);
      const qs = params.toString() ? `?${params}` : '';
      return apiFetch<Player[]>(`/players${qs}`);
    },
  });
}

export interface PlayerInput {
  name: string;
  primary_position: string;
  secondary_position?: string | null;
  prior_team?: string | null;
  prior_team_division?: string | null;
  notes?: string | null;
  group_id?: number | null;
  team_id?: number | null;
}

export function useCreatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PlayerInput) =>
      apiFetch<Player>('/players', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: playerKeys.all }),
  });
}

export function useUpdatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & PlayerInput) =>
      apiFetch<Player>(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: playerKeys.all });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useDeletePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/players/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: playerKeys.all });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useAssignPlayerGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, group_id }: { id: number; group_id: number | null }) =>
      apiFetch<Player>(`/players/${id}/group`, { method: 'PATCH', body: JSON.stringify({ group_id }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: playerKeys.all });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export interface ImportResult {
  imported: number;
  errors: Array<{ row: number; message: string }>;
  players: Player[];
}

export function useImportPlayers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (csv: string): Promise<ImportResult> => {
      const res = await fetch('/api/players/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (result) => {
      if (result.imported > 0) {
        qc.invalidateQueries({ queryKey: playerKeys.all });
        qc.invalidateQueries({ queryKey: ['groups'] });
        qc.invalidateQueries({ queryKey: ['teams'] });
      }
    },
  });
}

export function useAssignPlayerTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, team_id }: { id: number; team_id: number | null }) =>
      apiFetch<Player>(`/players/${id}/team`, { method: 'PATCH', body: JSON.stringify({ team_id }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: playerKeys.all });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
