import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '@/lib/api/authApi'
import { getAuthToken, getStoredUser } from '@/lib/api/apiClient'
import type { User } from '@/types/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser<User>())
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const token = getAuthToken()
    const stored = getStoredUser<User>()
    // If we have token and stored user, we're not blocking initial render
    return !(token && stored)
  })

  const refreshUser = async () => {
    const token = getAuthToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const currentUser = await authApi.getMe()
      setUser(currentUser)
    } catch (err) {
      console.warn('Session check note:', err)
      // Only nullify user if the token was removed
      if (!getAuthToken()) {
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass)
    setUser(res.user)
  }

  const logout = () => {
    const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    authApi.logout()
    setUser(null)
    window.location.href = `${basePath}/login`
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user && (user.role || '').toLowerCase() === 'admin',
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
