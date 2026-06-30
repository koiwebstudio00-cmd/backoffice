import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ClientsPage = lazy(() => import('./pages/ClientsPage').then((module) => ({ default: module.ClientsPage })))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage').then((module) => ({ default: module.ClientDetailPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })))
const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((module) => ({ default: module.CalendarPage })))
const CredentialsPage = lazy(() => import('./pages/CredentialsPage').then((module) => ({ default: module.CredentialsPage })))
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
                <Route path="clientes/:clientId" element={<ClientDetailPage />} />
                <Route path="proyectos" element={<ProjectsPage />} />
                <Route path="proyectos/:projectId" element={<ProjectDetailPage />} />
                <Route path="finanzas" element={<FinancePage />} />
                <Route path="calendario" element={<CalendarPage />} />
                <Route path="credenciales" element={<CredentialsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
