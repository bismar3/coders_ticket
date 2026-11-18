import { Navigate, useLocation } from 'react-router'
import { HOME_BY_ROLE, useAuth } from '../../context/AuthContext'

/** Protege una ruta por sesión y, opcionalmente, por rol. */
export function RequireRole({ roles, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role] ?? '/'} replace />
  return children
}

/** Si ya hay sesión, no tiene sentido mostrar login/registro. */
export function GuestOnly({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user) return <Navigate to={location.state?.from ?? HOME_BY_ROLE[user.role] ?? '/'} replace />
  return children
}
