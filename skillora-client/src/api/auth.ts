import { api } from '@/api/client';
import type { LoginResponse, MessageResponse, RegisterResponse } from '@/api/types';

/** 201 with no token: the caller logs in afterwards. */
export async function register(name: string, email: string, password: string): Promise<RegisterResponse> {
  const res = await api.post<RegisterResponse>('/auth/register', { name, email, password });
  return res.data;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  return res.data;
}

/** Revokes the current session on the server. Callers ignore its errors. */
export async function logout(): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>('/auth/logout');
  return res.data;
}
