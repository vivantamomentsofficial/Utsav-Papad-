import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSession, isAdmin as checkIsAdmin } from '../services/auth'

export function ProtectedRoute() {
  const location = useLocation()
  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: getSession,
  })
  const { data: adminAccess, isLoading: checkingRole } = useQuery<boolean>({
    queryKey: ['admin-role', session?.user.id],
    enabled: Boolean(session),
    queryFn: async (): Promise<boolean> => {
      return checkIsAdmin(session!.user.id)
    },
  })
  if (isLoading || (session && checkingRole)) return <div className="loading">Checking session…</div>
  return session && adminAccess ? <Outlet /> : <Navigate to="/admin/login" state={{ from: location }} replace />
}
