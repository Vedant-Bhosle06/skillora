import { api } from '@/api/client';
import type { CompleteSkillResponse, Me, MessageResponse, Proficiency } from '@/api/types';

const enc = encodeURIComponent;

export async function getMe(): Promise<Me> {
  const res = await api.get<Me>('/users/me');
  return res.data;
}

/** Replaces the whole currentSkills list: send every skill to keep. */
export async function saveSkills(skills: Array<{ skillId: string; proficiency: Proficiency }>): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>('/users/me/skills', { skills });
  return res.data;
}

export async function setTargetRole(roleId: string): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>('/users/me/target-role', { roleId });
  return res.data;
}

/** `skillId` is the skill's id (skillId._id), not the sub-document _id. */
export async function updateSkillProficiency(skillId: string, proficiency: Proficiency): Promise<MessageResponse> {
  const res = await api.patch<MessageResponse>(`/users/me/skills/${enc(skillId)}`, { proficiency });
  return res.data;
}

export async function removeSkill(skillId: string): Promise<MessageResponse> {
  const res = await api.delete<MessageResponse>(`/users/me/skills/${enc(skillId)}`);
  return res.data;
}

export async function deleteAccount(): Promise<MessageResponse> {
  const res = await api.delete<MessageResponse>('/users/me');
  return res.data;
}

/** 200 gives { message, path } (new document); 202 gives { recomputePending: true, message }. */
export async function completeSkill(skillId: string): Promise<CompleteSkillResponse> {
  const res = await api.post<CompleteSkillResponse>('/users/me/skills/complete', { skillId }, { timeout: 90000 });
  return res.data;
}

/** Undo a completion for the current target role. Same 200 / 202 shapes as completeSkill. */
export async function uncompleteSkill(skillId: string): Promise<CompleteSkillResponse> {
  const res = await api.delete<CompleteSkillResponse>(`/users/me/skills/complete/${enc(skillId)}`, { timeout: 90000 });
  return res.data;
}
