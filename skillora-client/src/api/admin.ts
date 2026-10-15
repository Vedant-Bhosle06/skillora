import { api } from '@/api/client';
import type { EdgeInput, GraphMetrics, MessageResponse, Role, RoleInput, Skill, SkillEdge, SkillInput } from '@/api/types';

const enc = encodeURIComponent;

// ── Skills ────────────────────────────────────────────────────────────────────

export async function createSkill(input: SkillInput): Promise<Skill> {
  const res = await api.post<Skill>('/admin/skills', input);
  return res.data;
}

export async function updateSkill(id: string, input: Partial<SkillInput>): Promise<Skill> {
  const res = await api.patch<Skill>(`/admin/skills/${enc(id)}`, input);
  return res.data;
}

/** 409 while a role still requires the skill; also deletes its edges. */
export async function deleteSkill(id: string): Promise<MessageResponse> {
  const res = await api.delete<MessageResponse>(`/admin/skills/${enc(id)}`);
  return res.data;
}

// ── Edges ─────────────────────────────────────────────────────────────────────

export async function getAdminEdges(skillId?: string): Promise<SkillEdge[]> {
  const res = await api.get<SkillEdge[]>('/admin/edges', { params: skillId ? { skillId } : undefined });
  return res.data;
}

/** `source` in the body is a curation note; the prerequisite is `sourceSkillId`. */
export async function createEdge(input: EdgeInput): Promise<SkillEdge> {
  const res = await api.post<SkillEdge>('/admin/edges', input);
  return res.data;
}

export async function updateEdge(id: string, input: Partial<EdgeInput>): Promise<SkillEdge> {
  const res = await api.patch<SkillEdge>(`/admin/edges/${enc(id)}`, input);
  return res.data;
}

export async function deleteEdge(id: string): Promise<MessageResponse> {
  const res = await api.delete<MessageResponse>(`/admin/edges/${enc(id)}`);
  return res.data;
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export async function createRole(input: RoleInput): Promise<Role> {
  const res = await api.post<Role>('/admin/roles', input);
  return res.data;
}

export async function updateRole(id: string, input: Partial<RoleInput>): Promise<Role> {
  const res = await api.patch<Role>(`/admin/roles/${enc(id)}`, input);
  return res.data;
}

export async function deleteRole(id: string): Promise<MessageResponse> {
  const res = await api.delete<MessageResponse>(`/admin/roles/${enc(id)}`);
  return res.data;
}

// ── Graph health ──────────────────────────────────────────────────────────────

export async function getGraphMetrics(): Promise<GraphMetrics> {
  const res = await api.get<GraphMetrics>('/admin/graph/metrics');
  return res.data;
}
