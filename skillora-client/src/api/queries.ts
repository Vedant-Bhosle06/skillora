// The only way pages read or change server data. Each hook wraps one endpoint
// wrapper and owns its cache key and invalidation.
import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as adminApi from '@/api/admin';
import { getActivePath, getAlternatives, getHistory, selectPath } from '@/api/paths';
import { getRole, getRoles } from '@/api/roles';
import { getAllSkills, getGraph, getPublicStats, getSkill, searchSkills } from '@/api/skills';
import type { EdgeInput, Proficiency, RoleInput, Skill, SkillInput } from '@/api/types';
import { completeSkill, deleteAccount, removeSkill, saveSkills, setTargetRole, updateSkillProficiency } from '@/api/users';

const FIVE_MIN = 5 * 60_000;

export type GraphScope = 'full' | 'path';

export const qk = {
  me: ['me'] as const,
  stats: ['stats'] as const,
  skills: ['skills', 'all'] as const,
  skillSearch: (q: string) => ['skills', 'search', q] as const,
  skill: (id: string) => ['skill', id] as const,
  roles: ['roles'] as const,
  role: (id: string) => ['role', id] as const,
  graph: (scope: GraphScope) => ['graph', scope] as const,
  activePath: ['paths', 'active'] as const,
  alternatives: (id: string) => ['paths', 'alternatives', id] as const,
  history: ['paths', 'history'] as const,
  adminEdges: (skillId?: string) => ['admin', 'edges', skillId ?? 'all'] as const,
  adminMetrics: ['admin', 'metrics'] as const,
};

// ── Invalidation helpers ──────────────────────────────────────────────────────

/** After any change to the user's profile, role or path. */
export function invalidateUserData(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: qk.me }),
    qc.invalidateQueries({ queryKey: ['paths'] }),
    qc.invalidateQueries({ queryKey: qk.graph('path') }),
  ]);
}

/** After any admin write: the dataset changed and every path went stale. */
export function invalidateCatalog(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['skills'] }),
    qc.invalidateQueries({ queryKey: ['skill'] }),
    qc.invalidateQueries({ queryKey: ['roles'] }),
    qc.invalidateQueries({ queryKey: ['role'] }),
    qc.invalidateQueries({ queryKey: ['graph'] }),
    qc.invalidateQueries({ queryKey: ['admin'] }),
    qc.invalidateQueries({ queryKey: qk.stats }),
    invalidateUserData(qc),
  ]);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useSkillsCatalog() {
  const query = useQuery({ queryKey: qk.skills, queryFn: getAllSkills, staleTime: FIVE_MIN });
  const byId = useMemo(() => new Map<string, Skill>((query.data ?? []).map((s) => [s._id, s])), [query.data]);
  return { ...query, byId };
}

export function useSkillSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.skillSearch(term),
    queryFn: () => searchSkills(term),
    enabled: term.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useSkillDetail(id: string | null) {
  return useQuery({
    queryKey: qk.skill(id ?? ''),
    queryFn: () => getSkill(id as string),
    enabled: !!id,
  });
}

export function useRoles() {
  return useQuery({ queryKey: qk.roles, queryFn: getRoles, staleTime: FIVE_MIN });
}

export function useRoleDetail(id: string | null) {
  return useQuery({
    queryKey: qk.role(id ?? ''),
    queryFn: () => getRole(id as string),
    enabled: !!id,
  });
}

export function usePublicStats() {
  return useQuery({ queryKey: qk.stats, queryFn: getPublicStats });
}

export function useGraph(scope: GraphScope, enabled = true) {
  return useQuery({ queryKey: qk.graph(scope), queryFn: () => getGraph(scope), enabled, staleTime: FIVE_MIN });
}

export function useActivePath() {
  return useQuery({ queryKey: qk.activePath, queryFn: getActivePath });
}

export function useAlternatives(id: string | null) {
  return useQuery({
    queryKey: qk.alternatives(id ?? ''),
    queryFn: () => getAlternatives(id as string),
    enabled: !!id,
  });
}

export function usePathHistory() {
  return useQuery({ queryKey: qk.history, queryFn: getHistory });
}

export function useAdminEdges(skillId?: string) {
  return useQuery({ queryKey: qk.adminEdges(skillId), queryFn: () => adminApi.getAdminEdges(skillId) });
}

export function useAdminMetrics() {
  return useQuery({ queryKey: qk.adminMetrics, queryFn: adminApi.getGraphMetrics });
}

// ── Learner mutations ─────────────────────────────────────────────────────────

export function useSaveSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skills: Array<{ skillId: string; proficiency: Proficiency }>) => saveSkills(skills),
    onSuccess: () => invalidateUserData(qc),
  });
}

export function useSetTargetRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => setTargetRole(roleId),
    onSuccess: () => invalidateUserData(qc),
  });
}

export function useUpdateProficiency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, proficiency }: { skillId: string; proficiency: Proficiency }) =>
      updateSkillProficiency(skillId, proficiency),
    onSuccess: () => invalidateUserData(qc),
  });
}

export function useRemoveSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => removeSkill(skillId),
    onSuccess: () => invalidateUserData(qc),
  });
}

export function useSelectPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rank: number) => selectPath(rank),
    onSuccess: () =>
      Promise.all([qc.invalidateQueries({ queryKey: qk.me }), qc.invalidateQueries({ queryKey: qk.graph('path') })]),
  });
}

/** No automatic invalidation: the progress page handles the 200/202/error cases. */
export function useCompleteSkill() {
  return useMutation({ mutationFn: (skillId: string) => completeSkill(skillId) });
}

/** No invalidation: the caller runs clearSession() afterwards. */
export function useDeleteAccount() {
  return useMutation({ mutationFn: deleteAccount });
}

// ── Admin mutations ───────────────────────────────────────────────────────────

function useAdminMutation<TVars, TData>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => invalidateCatalog(qc) });
}

export const useCreateSkill = () => useAdminMutation((input: SkillInput) => adminApi.createSkill(input));
export const useUpdateSkill = () =>
  useAdminMutation(({ id, input }: { id: string; input: Partial<SkillInput> }) => adminApi.updateSkill(id, input));
export const useDeleteSkill = () => useAdminMutation((id: string) => adminApi.deleteSkill(id));

export const useCreateEdge = () => useAdminMutation((input: EdgeInput) => adminApi.createEdge(input));
export const useUpdateEdge = () =>
  useAdminMutation(({ id, input }: { id: string; input: Partial<EdgeInput> }) => adminApi.updateEdge(id, input));
export const useDeleteEdge = () => useAdminMutation((id: string) => adminApi.deleteEdge(id));

export const useCreateRole = () => useAdminMutation((input: RoleInput) => adminApi.createRole(input));
export const useUpdateRole = () =>
  useAdminMutation(({ id, input }: { id: string; input: Partial<RoleInput> }) => adminApi.updateRole(id, input));
export const useDeleteRole = () => useAdminMutation((id: string) => adminApi.deleteRole(id));
