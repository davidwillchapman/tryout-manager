import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { PeriodizationPlan } from '../types';

export const periodizationKeys = {
  team: (teamId: number) => ['periodization', teamId] as const,
};

export function usePeriodizationPlan(teamId: number) {
  return useQuery({
    queryKey: periodizationKeys.team(teamId),
    queryFn: () => apiFetch<PeriodizationPlan>(`/periodization/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export function useUpdatePeriodizationPlan(teamId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<PeriodizationPlan>(`/periodization/teams/${teamId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: periodizationKeys.team(teamId) }),
  });
}
