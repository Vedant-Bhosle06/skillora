import { api, ApiError } from '@/api/client';
import type { AlternativesResponse, ComputedPathDoc, MessageResponse } from '@/api/types';

// Compute may wait for the path service to wake (up to ~60 s) before it runs.
const COMPUTE_TIMEOUT_MS = 120000;

export async function computePath(): Promise<ComputedPathDoc> {
  const res = await api.post<ComputedPathDoc>('/paths/compute', undefined, { timeout: COMPUTE_TIMEOUT_MS });
  return res.data;
}

/** The latest active or stale document, or null when the user has none yet. */
export async function getActivePath(): Promise<ComputedPathDoc | null> {
  try {
    const res = await api.get<ComputedPathDoc>('/paths/active');
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getAlternatives(pathDocId: string): Promise<AlternativesResponse> {
  const res = await api.get<AlternativesResponse>(`/paths/${encodeURIComponent(pathDocId)}/alternatives`);
  return res.data;
}

export async function selectPath(rank: number): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>('/paths/select', { rank });
  return res.data;
}

/** Archived documents, newest first. */
export async function getHistory(): Promise<ComputedPathDoc[]> {
  const res = await api.get<ComputedPathDoc[]>('/paths/history');
  return res.data;
}
