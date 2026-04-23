import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { LeagueSeason, LeagueDivision, LeagueStanding, ImportSummary } from '../types';

export const leagueKeys = {
  seasons: () => ['league-results', 'seasons'] as const,
  season: (id: number) => ['league-results', 'seasons', id] as const,
  divisions: (seasonId: number) => ['league-results', 'seasons', seasonId, 'divisions'] as const,
  division: (id: number) => ['league-results', 'divisions', id] as const,
  standings: (divisionId: number) => ['league-results', 'divisions', divisionId, 'standings'] as const,
};

// ─── Seasons ──────────────────────────────────────────────────────────────────

export function useLeagueSeasons() {
  return useQuery({
    queryKey: leagueKeys.seasons(),
    queryFn: () => apiFetch<LeagueSeason[]>('/league-results/seasons'),
  });
}

export function useLeagueSeason(id: number) {
  return useQuery({
    queryKey: leagueKeys.season(id),
    queryFn: () => apiFetch<LeagueSeason>(`/league-results/seasons/${id}`),
  });
}

type SeasonInput = { name: string; year: number; description?: string | null; source_url?: string | null };

export function useCreateLeagueSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SeasonInput) =>
      apiFetch<LeagueSeason>('/league-results/seasons', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.seasons() }),
  });
}

export function useUpdateLeagueSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & SeasonInput) =>
      apiFetch<LeagueSeason>(`/league-results/seasons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: leagueKeys.seasons() });
      qc.invalidateQueries({ queryKey: leagueKeys.season(vars.id) });
    },
  });
}

export function useDeleteLeagueSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/league-results/seasons/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.seasons() }),
  });
}

export function useImportLeagueSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ seasonId, source_url }: { seasonId: number; source_url?: string | null }) =>
      apiFetch<ImportSummary>(`/league-results/seasons/${seasonId}/import`, {
        method: 'POST',
        body: JSON.stringify({ source_url: source_url ?? null }),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: leagueKeys.seasons() });
      qc.invalidateQueries({ queryKey: leagueKeys.divisions(vars.seasonId) });
    },
  });
}

// ─── Divisions ────────────────────────────────────────────────────────────────

export function useLeagueDivisions(seasonId: number) {
  return useQuery({
    queryKey: leagueKeys.divisions(seasonId),
    queryFn: () => apiFetch<LeagueDivision[]>(`/league-results/seasons/${seasonId}/divisions`),
  });
}

export function useLeagueDivision(id: number) {
  return useQuery({
    queryKey: leagueKeys.division(id),
    queryFn: () => apiFetch<LeagueDivision>(`/league-results/divisions/${id}`),
  });
}

type DivisionInput = { name: string; age_group?: string | null; gender?: string | null; division?: string | null; source_url?: string | null };

export function useCreateLeagueDivision(seasonId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DivisionInput) =>
      apiFetch<LeagueDivision>(`/league-results/seasons/${seasonId}/divisions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.divisions(seasonId) }),
  });
}

export function useUpdateLeagueDivision(seasonId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & DivisionInput) =>
      apiFetch<LeagueDivision>(`/league-results/divisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: leagueKeys.divisions(seasonId) });
      qc.invalidateQueries({ queryKey: leagueKeys.division(vars.id) });
    },
  });
}

export function useDeleteLeagueDivision(seasonId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/league-results/divisions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.divisions(seasonId) }),
  });
}

// ─── Standings ────────────────────────────────────────────────────────────────

export function useLeagueStandings(divisionId: number) {
  return useQuery({
    queryKey: leagueKeys.standings(divisionId),
    queryFn: () => apiFetch<LeagueStanding[]>(`/league-results/divisions/${divisionId}/standings`),
  });
}

type StandingInput = {
  team_name: string;
  points?: number;
  games_played?: number;
  wins?: number;
  losses?: number;
  ties?: number;
  goals_for?: number;
  goals_against?: number;
  finish_place?: number | null;
};

export function useCreateLeagueStanding(divisionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StandingInput) =>
      apiFetch<LeagueStanding>(`/league-results/divisions/${divisionId}/standings`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.standings(divisionId) }),
  });
}

export function useUpdateLeagueStanding(divisionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & StandingInput) =>
      apiFetch<LeagueStanding>(`/league-results/standings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.standings(divisionId) }),
  });
}

export function useDeleteLeagueStanding(divisionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/league-results/standings/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: leagueKeys.standings(divisionId) }),
  });
}
