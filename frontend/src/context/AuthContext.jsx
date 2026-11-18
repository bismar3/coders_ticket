import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, setUnauthorizedHandler, tokenStore } from '../lib/api'

const AuthContext = createContext(null)

/** Lee el payload del JWT (sin validarlo: eso lo hace cada servicio). */
function decode(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp * 1000 < Date.now()) return null
    return { id: payload.sub, name: payload.name, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

export const HOME_BY_ROLE = { cliente: '/cartelera', organizador: '/organizador', portero: '/puerta' }
export const ROLE_LABEL = { cliente: 'Cliente', organizador: 'Organizador', portero: 'Portero' }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = tokenStore.get()
    const decoded = token ? decode(token) : null
    if (!decoded) tokenStore.set(null)
    return decoded
  })

  const logout = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
  }, [])

  useEffect(() => setUnauthorizedHandler(logout), [logout])

  const start = useCallback(({ access_token }) => {
    tokenStore.set(access_token)
    const decoded = decode(access_token)
    setUser(decoded)
    return decoded
  }, [])

  const [profileOpen, setProfileOpen] = useState(false)

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    login: async (email, password) => start(await authApi.login(email, password)),
    register: async (name, email, password) => start(await authApi.register(name, email, password)),
    /** Guarda el token nuevo que devuelve auth al editar el perfil. */
    renew: start,
    logout: () => { setProfileOpen(false); logout() },
    profileOpen,
    openProfile: () => setProfileOpen(true),
    closeProfile: () => setProfileOpen(false),
  }), [user, start, logout, profileOpen])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
