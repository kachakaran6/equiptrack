import { apiRequest } from './apiClient'
import type { User, UserRole, UserStatus } from '@/types/api'

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role?: UserRole
  phone?: string
}

export const usersApi = {
  async listUsers(): Promise<User[]> {
    const res = await apiRequest<{ success: boolean; data: User[] }>('/api/admin/users')
    return res.data
  },

  async getUser(id: string): Promise<User> {
    const res = await apiRequest<{ success: boolean; data: User }>(`/api/admin/users/${id}`)
    return res.data
  },

  async createUser(input: CreateUserInput): Promise<User> {
    const res = await apiRequest<{ success: boolean; data: User }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        role: input.role ? input.role.toLowerCase() : 'user',
      }),
    })
    return res.data
  },

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    const res = await apiRequest<{ success: boolean; data: User }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: role.toLowerCase() }),
    })
    return res.data
  },

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    const res = await apiRequest<{ success: boolean; data: User }>(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: status.toLowerCase() }),
    })
    return res.data
  },

  async updateUserPassword(id: string, password: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    })
  },

  async deleteUser(id: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    })
  },
}
