import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../api/index.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
  }, [])

  async function login(username_email, password) {
    const data = await authApi.login(username_email, password)
    if (data.access_token) {
      setToken(data.access_token)
      setUser(data.user)
      localStorage.setItem('auth_token', data.access_token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      return { success: true }
    }
    return { success: false, error: data.detail || data.non_field_errors?.[0] || 'Błąd logowania' }
  }

  async function register(username, email, password) {
    const data = await authApi.register(username, email, password)
    if (data.access_token) {
      setToken(data.access_token)
      setUser(data.user)
      localStorage.setItem('auth_token', data.access_token)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      return { success: true }
    }
    const error =
      data.username?.[0] ||
      data.email?.[0] ||
      data.password?.[0] ||
      data.detail ||
      'Błąd rejestracji'
    return { success: false, error }
  }

  async function logout() {
    if (token) {
      await authApi.logout(token).catch(() => {})
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
