'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { AuthUser } from './api'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (user: AuthUser, token: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      // Sincronizar con la DB para tener isAdmin actualizado
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.user) {
            localStorage.setItem('user', JSON.stringify(data.user))
            setUser(data.user)
          } else {
            setUser(JSON.parse(savedUser))
          }
        })
        .catch(() => setUser(JSON.parse(savedUser)))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  function login(user: AuthUser, token: string) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    setToken(token)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
