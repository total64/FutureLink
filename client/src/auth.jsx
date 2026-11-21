import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, restoreSession, setAccessToken, setUnauthorizedHandler } from './lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken('')
      setUser(null)
    })
    restoreSession()
      .then((session) => {
        if (session) setUser(session.user)
      })
      .finally(() => setReady(true))
  }, [])

  const value = useMemo(() => ({
    user,
    ready,
    async register(payload) {
      const data = await api('/auth/register', { method: 'POST', body: payload })
      setAccessToken(data.accessToken)
      setUser(data.user)
      return data.user
    },
    async login(payload) {
      const data = await api('/auth/login', { method: 'POST', body: payload })
      setAccessToken(data.accessToken)
      setUser(data.user)
      return data.user
    },
    async logout() {
      await api('/auth/logout', { method: 'POST' }).catch(() => {})
      setAccessToken('')
      setUser(null)
    },
  }), [user, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
