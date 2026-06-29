import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './auth-context'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="grid min-h-svh place-items-center bg-background" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <span className="grid size-10 animate-pulse place-items-center rounded-xl rounded-br-sm bg-primary font-black text-primary-foreground">K</span>
          <span>Cargando tu espacio de trabajo…</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
