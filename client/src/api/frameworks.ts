import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { Framework, FrameworkWithSections, FrameworkSection } from '../types';

export const frameworkKeys = {
  all: ['frameworks'] as const,
  detail: (id: number) => ['frameworks', id] as const,
  sections: (id: number) => ['frameworks', id, 'sections'] as const,
};

export function useFrameworks() {
  return useQuery({
    queryKey: frameworkKeys.all,
    queryFn: () => apiFetch<Framework[]>('/frameworks'),
  });
}

export function useFramework(id: number) {
  return useQuery({
    queryKey: frameworkKeys.detail(id),
    queryFn: () => apiFetch<FrameworkWithSections>(`/frameworks/${id}`),
    enabled: !!id,
  });
}

export function useCreateFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; source?: string | null; version?: string | null; description?: string | null }) =>
      apiFetch<Framework>('/frameworks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: frameworkKeys.all }),
  });
}

export function useImportFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      fetch('/api/frameworks/import', { method: 'POST', body: formData }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<Framework>;
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: frameworkKeys.all }),
  });
}

export function useUpdateFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; source?: string | null; version?: string | null; description?: string | null }) =>
      apiFetch<Framework>(`/frameworks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: frameworkKeys.all });
      qc.invalidateQueries({ queryKey: frameworkKeys.detail(id) });
    },
  });
}

export function useDeleteFramework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/frameworks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: frameworkKeys.all }),
  });
}

export function useAddSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ frameworkId, ...data }: { frameworkId: number; title: string; content?: string | null; parent_id?: number | null; order_index?: number }) =>
      apiFetch<FrameworkSection>(`/frameworks/${frameworkId}/sections`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, { frameworkId }) => qc.invalidateQueries({ queryKey: frameworkKeys.detail(frameworkId) }),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ frameworkId, sectionId, ...data }: { frameworkId: number; sectionId: number; title: string; content?: string | null; parent_id?: number | null; order_index?: number }) =>
      apiFetch<FrameworkSection>(`/frameworks/${frameworkId}/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { frameworkId }) => qc.invalidateQueries({ queryKey: frameworkKeys.detail(frameworkId) }),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ frameworkId, sectionId }: { frameworkId: number; sectionId: number }) =>
      apiFetch<void>(`/frameworks/${frameworkId}/sections/${sectionId}`, { method: 'DELETE' }),
    onSuccess: (_, { frameworkId }) => qc.invalidateQueries({ queryKey: frameworkKeys.detail(frameworkId) }),
  });
}
