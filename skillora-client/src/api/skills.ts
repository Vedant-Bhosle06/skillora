import { api } from '@/api/client';
import type { GraphResponse, PublicStats, Skill, SkillDetail } from '@/api/types';

/** Every skill in the catalog, unsorted. */
export async function getAllSkills(): Promise<Skill[]> {
  const res = await api.get<Skill[]>('/skills');
  return res.data;
}

/** Word-prefix match on name and aliases, sorted by name, max 20. */
export async function searchSkills(search: string): Promise<Skill[]> {
  const res = await api.get<Skill[]>('/skills', { params: { search } });
  return res.data;
}

export async function getSkill(id: string): Promise<SkillDetail> {
  const res = await api.get<SkillDetail>(`/skills/${encodeURIComponent(id)}`);
  return res.data;
}

/** scope=path returns the full graph when the user has no active path. */
export async function getGraph(scope: 'full' | 'path'): Promise<GraphResponse> {
  const res = await api.get<GraphResponse>('/graph', { params: { scope } });
  return res.data;
}

export async function getPublicStats(): Promise<PublicStats> {
  const res = await api.get<PublicStats>('/stats/public');
  return res.data;
}
