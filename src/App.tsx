import { lazy, Suspense } from 'react'
import { CalendarDays, CircleDollarSign, KeyRound } from 'lucide-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ClientsPage = lazy(() => import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const PlaceholderPage = lazy(() => import('./pages/PlaceholderPage').then((module) => ({ default: module.PlaceholderPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

function RouteFallback() {
  return <div className="grid min-h-[55vh] place-items-center text-sm text-muted-foreground" role="status">Cargando módulo…</div>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="clientes" element={<ClientsPage />} />
                <Route path="proyectos" element={<ProjectsPage />} />
                <Route path="finanzas" element={<PlaceholderPage eyebrow="CONTROL" title="Finanzas" description="Ingresos, gastos y rentabilidad sin mezclar monedas." icon={CircleDollarSign} milestones={['P&L separado por moneda', 'Rentabilidad por proyecto', 'Cuotas y vencimientos']} />} />
                <Route path="calendario" element={<PlaceholderPage eyebrow="AGENDA" title="Calendario" description="Reuniones y deadlines reunidos en una sola vista." icon={CalendarDays} milestones={['Eventos de Google Calendar', 'Deadlines de proyectos', 'Vista semanal unificada']} />} />
                <Route path="boveda" element={<PlaceholderPage eyebrow="SEGURIDAD" title="Bóveda" description="Credenciales cifradas y accesibles solo cuando hacen falta." icon={KeyRound} milestones={['Cifrado AES-256-GCM', 'Revalidación al revelar', 'Auditoría de accesos']} />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
