import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../../../types/api';
import { request } from '../../../api/client';

export const register = (body: RegisterRequest) =>
  request<AuthResponse>('POST', '/auth/register', body);

export const login = (body: LoginRequest) =>
  request<AuthResponse>('POST', '/auth/login', body);

export const me = () =>
  request<{ user: User }>('GET', '/auth/me', undefined, { silent401: true });

