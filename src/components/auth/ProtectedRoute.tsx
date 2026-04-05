import { Navigate, Outlet } from 'react-router-dom'
import { hasRole } from '../../features/auth/hasRole'
import { useAppSelector } from '../../app/hooks'

interface ProtectedRouteProps {
  roles?: string[]
}

function ProtectedRoute({ roles = [] }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />
  }

  if (roles.length > 0 && !hasRole(user.roles, roles)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
