import { api } from '@/api/client';
import type { Role, RoleDetail } from '@/api/types';

/** All roles, highest demand first. */
export async function getRoles(): Promise<Role[]> {
  const res = await api.get<Role[]>('/roles', { params: { sort: 'demand' } });
  return res.data;
}

export async function getRole(id: string): Promise<RoleDetail> {
  const res = await api.get<RoleDetail>(`/roles/${encodeURIComponent(id)}`);
  return res.data;
}
