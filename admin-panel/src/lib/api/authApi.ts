import { apiRequest, setAuthToken, setStoredUser, removeAuthToken } from './apiClient'
import type { User } from '@/types/api'

export interface LoginResponse {
  token: string
  user: User
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiRequest<{ success: boolean; data: { token: string; user: User } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    const payload = data.data
    const userRole = (payload.user?.role || '').toLowerCase()
    if (userRole !== 'admin') {
      throw new Error('Administrator access required.')
    }

    setAuthToken(payload.token)
    setStoredUser(payload.user)
    return payload
  },

  async getMe(): Promise<User> {
    const data = await apiRequest<{ success: boolean; data: User }>('/api/auth/me')
    const user = data.data
    const userRole = (user?.role || '').toLowerCase()
    if (userRole !== 'admin') {
      removeAuthToken()
      throw new Error('Administrator access required.')
    }
    setStoredUser(user)
    return user
  },

  logout(): void {
    removeAuthToken()
  },
}
