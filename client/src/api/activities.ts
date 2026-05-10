import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type {
  Activity,
  ActivityDetail,
  ActivityFrameworkTag,
  ActivityReference,
  ActivityProgression,
  ActivityImportResult,
  UploadedImage,
} from '../types';

export const activityKeys = {
  all: ['activities'] as const,
  detail: (id: number) => ['activities', id] as const,
  tags: (id: number) => ['activities', id, 'tags'] as const,
  references: (id: number) => ['activities', id, 'references'] as const,
  progressions: (id: number) => ['activities', id, 'progressions'] as const,
};

export function useActivities() {
  return useQuery({
    queryKey: activityKeys.all,
    queryFn: () => apiFetch<Activity[]>('/activities'),
  });
}

export function useActivity(id: number) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: () => apiFetch<ActivityDetail>(`/activities/${id}`),
    enabled: !!id,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Activity, 'id' | 'tag_count' | 'created_at' | 'updated_at'>) =>
      apiFetch<Activity>('/activities', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function useImportActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      fetch('/api/activities/import', { method: 'POST', body: formData }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<ActivityImportResult>;
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Omit<Activity, 'id' | 'tag_count' | 'created_at' | 'updated_at'>) =>
      apiFetch<Activity>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: activityKeys.all });
      qc.invalidateQueries({ queryKey: activityKeys.detail(id) });
    },
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/activities/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

export function useCloneActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<Activity>(`/activities/${id}/clone`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: activityKeys.all }),
  });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────
export function useAddTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityId,
      framework_id,
      phase_section_id,
      principle_section_id,
      sub_principle_section_id,
    }: {
      activityId: number;
      framework_id: number;
      phase_section_id?: number | null;
      principle_section_id?: number | null;
      sub_principle_section_id?: number | null;
    }) =>
      apiFetch<ActivityFrameworkTag>(`/activities/${activityId}/tags`, {
        method: 'POST',
        body: JSON.stringify({ framework_id, phase_section_id, principle_section_id, sub_principle_section_id }),
      }),
    onSuccess: (_, { activityId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, tagId }: { activityId: number; tagId: number }) =>
      apiFetch<void>(`/activities/${activityId}/tags/${tagId}`, { method: 'DELETE' }),
    onSuccess: (_, { activityId }) => {
      qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      qc.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

// ─── References ───────────────────────────────────────────────────────────────
export function useAddReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, ...data }: { activityId: number; url: string; label?: string | null; order_index?: number }) =>
      apiFetch<ActivityReference>(`/activities/${activityId}/references`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, { activityId }) => qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) }),
  });
}

export function useUpdateReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, refId, ...data }: { activityId: number; refId: number; url: string; label?: string | null; order_index?: number }) =>
      apiFetch<ActivityReference>(`/activities/${activityId}/references/${refId}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (_, { activityId }) => qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) }),
  });
}

export function useDeleteReference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, refId }: { activityId: number; refId: number }) =>
      apiFetch<void>(`/activities/${activityId}/references/${refId}`, { method: 'DELETE' }),
    onSuccess: (_, { activityId }) => qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) }),
  });
}

// ─── Progressions ─────────────────────────────────────────────────────────────
export function useAddProgression() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, progression_activity_id }: { activityId: number; progression_activity_id: number }) =>
      apiFetch<ActivityProgression>(`/activities/${activityId}/progressions`, {
        method: 'POST',
        body: JSON.stringify({ progression_activity_id }),
      }),
    onSuccess: (_, { activityId }) => qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) }),
  });
}

export function useDeleteProgression() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, progressionId }: { activityId: number; progressionId: number }) =>
      apiFetch<void>(`/activities/${activityId}/progressions/${progressionId}`, { method: 'DELETE' }),
    onSuccess: (_, { activityId }) => qc.invalidateQueries({ queryKey: activityKeys.detail(activityId) }),
  });
}

// ─── Image upload ─────────────────────────────────────────────────────────────
export function useUploadImage() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      fetch('/api/activities/images', { method: 'POST', body: formData }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<UploadedImage>;
      }),
  });
}
