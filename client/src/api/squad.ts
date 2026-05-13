import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { SquadTeam, SquadPlayer, Formation, FormationSlot, FormationTemplate } from '../types';

export const squadKeys = {
  teams: ['squad', 'teams'] as const,
  team: (id: number) => ['squad', 'teams', id] as const,
  players: (teamId: number) => ['squad', 'teams', teamId, 'players'] as const,
  formations: (teamId: number) => ['squad', 'teams', teamId, 'formations'] as const,
  formation: (teamId: number, formationId: number) => ['squad', 'teams', teamId, 'formations', formationId] as const,
  templates: ['squad', 'templates'] as const,
  template: (id: number) => ['squad', 'templates', id] as const,
};

// ─── Squad Teams ──────────────────────────────────────────────────────────────
export function useSquadTeams() {
  return useQuery({ queryKey: squadKeys.teams, queryFn: () => apiFetch<SquadTeam[]>('/squad/teams') });
}

export function useSquadTeam(id: number) {
  return useQuery({
    queryKey: squadKeys.team(id),
    queryFn: () => apiFetch<SquadTeam>(`/squad/teams/${id}`),
    enabled: !!id,
  });
}

export function useCreateSquadTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null; season_label?: string | null }) =>
      apiFetch<SquadTeam>('/squad/teams', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.teams }),
  });
}

export function useImportSquadTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceTeamId, season_label }: { sourceTeamId: number; season_label?: string | null }) =>
      apiFetch<SquadTeam>(`/squad/teams/import/${sourceTeamId}`, { method: 'POST', body: JSON.stringify({ season_label: season_label ?? null }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.teams }),
  });
}

export function useUpdateSquadTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description?: string | null; season_label?: string | null }) =>
      apiFetch<SquadTeam>(`/squad/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: squadKeys.teams });
      qc.invalidateQueries({ queryKey: squadKeys.team(id) });
    },
  });
}

export function useToggleSquadTeamStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<SquadTeam>(`/squad/teams/${id}/status`, { method: 'PATCH' }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: squadKeys.teams });
      qc.invalidateQueries({ queryKey: squadKeys.team(id) });
    },
  });
}

export function useDeleteSquadTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/squad/teams/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.teams }),
  });
}

// ─── Squad Players ────────────────────────────────────────────────────────────
export function useSquadPlayers(teamId: number) {
  return useQuery({
    queryKey: squadKeys.players(teamId),
    queryFn: () => apiFetch<SquadPlayer[]>(`/squad/teams/${teamId}/players`),
    enabled: !!teamId,
  });
}

export function useAddSquadPlayer(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; primary_position?: string | null; secondary_position?: string | null; jersey_number?: string | null; status?: SquadPlayer['status'] }) =>
      apiFetch<SquadPlayer>(`/squad/teams/${teamId}/players`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.players(teamId) }),
  });
}

export function useUpdateSquadPlayer(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, ...data }: { playerId: number; name: string; primary_position?: string | null; secondary_position?: string | null; jersey_number?: string | null; depth_order?: number; status?: SquadPlayer['status'] }) =>
      apiFetch<SquadPlayer>(`/squad/teams/${teamId}/players/${playerId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadKeys.players(teamId) });
      qc.invalidateQueries({ queryKey: squadKeys.teams });
    },
  });
}

export function useUpdateDepthOrder(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: number; depth_order: number }[]) =>
      apiFetch<void>(`/squad/teams/${teamId}/players/depth-order`, { method: 'PUT', body: JSON.stringify(items) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.players(teamId) }),
  });
}

export function useDeleteSquadPlayer(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (playerId: number) => apiFetch<void>(`/squad/teams/${teamId}/players/${playerId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: squadKeys.players(teamId) });
      qc.invalidateQueries({ queryKey: squadKeys.teams });
    },
  });
}

// ─── Formations ───────────────────────────────────────────────────────────────
export function useFormations(teamId: number) {
  return useQuery({
    queryKey: squadKeys.formations(teamId),
    queryFn: () => apiFetch<Formation[]>(`/squad/teams/${teamId}/formations`),
    enabled: !!teamId,
  });
}

export function useFormation(teamId: number, formationId: number) {
  return useQuery({
    queryKey: squadKeys.formation(teamId, formationId),
    queryFn: () => apiFetch<Formation & { slots: FormationSlot[] }>(`/squad/teams/${teamId}/formations/${formationId}`),
    enabled: !!teamId && !!formationId,
  });
}

export function useCreateFormation(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; template_id?: number; formation_code?: string }) =>
      apiFetch<Formation>(`/squad/teams/${teamId}/formations`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.formations(teamId) }),
  });
}

export function useUpdateFormation(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formationId, ...data }: { formationId: number; name: string; formation_code: string }) =>
      apiFetch<Formation>(`/squad/teams/${teamId}/formations/${formationId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { formationId }) => {
      qc.invalidateQueries({ queryKey: squadKeys.formations(teamId) });
      qc.invalidateQueries({ queryKey: squadKeys.formation(teamId, formationId) });
    },
  });
}

export function useSetDefaultFormation(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formationId: number) =>
      apiFetch<Formation>(`/squad/teams/${teamId}/formations/${formationId}/default`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.formations(teamId) }),
  });
}

export function useDeleteFormation(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formationId: number) => apiFetch<void>(`/squad/teams/${teamId}/formations/${formationId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.formations(teamId) }),
  });
}

export function useSaveFormationSlots(teamId: number, formationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: { slot_id: number; squad_player_id: number | null }[]) =>
      apiFetch<void>(`/squad/teams/${teamId}/formations/${formationId}/slots`, { method: 'PUT', body: JSON.stringify(slots) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.formation(teamId, formationId) }),
  });
}

export function useUpdateSlotPositions(teamId: number, formationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (positions: { slot_id: number; x_pct: number; y_pct: number }[]) =>
      apiFetch<void>(`/squad/teams/${teamId}/formations/${formationId}/slot-positions`, { method: 'PATCH', body: JSON.stringify(positions) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.formation(teamId, formationId) }),
  });
}

// ─── Formation Templates ──────────────────────────────────────────────────────
export function useFormationTemplates() {
  return useQuery({ queryKey: squadKeys.templates, queryFn: () => apiFetch<FormationTemplate[]>('/squad/templates') });
}

export function useFormationTemplate(id: number) {
  return useQuery({
    queryKey: squadKeys.template(id),
    queryFn: () => apiFetch<FormationTemplate>(`/squad/templates/${id}`),
    enabled: !!id,
  });
}

export function useCreateFormationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slots: { slot_label: string; role: 'starter' | 'first_sub'; x_pct: number; y_pct: number }[] }) =>
      apiFetch<FormationTemplate>('/squad/templates', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.templates }),
  });
}

export function useUpdateFormationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; slots: { slot_label: string; role: 'starter' | 'first_sub'; x_pct: number; y_pct: number }[] }) =>
      apiFetch<FormationTemplate>(`/squad/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: squadKeys.templates });
      qc.invalidateQueries({ queryKey: squadKeys.template(id) });
    },
  });
}

export function useDeleteFormationTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/squad/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: squadKeys.templates }),
  });
}
