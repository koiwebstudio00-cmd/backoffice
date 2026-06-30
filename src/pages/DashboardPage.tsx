import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  ListTodo,
  ReceiptText,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { CalendarItemRow } from '@/components/CalendarItemRow'
import { KpiCard } from '@/components/KpiCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { listClients, listFinancialMovements, listMeetings, listProjects, type ClientRecord, type FinancialMovementRecord, type MeetingRecord, type ProjectRecord } from '@/data/repository'
import { buildCalendarItems, sortCalendarItems } from '@/lib/calendar'
import { formatLongDate, formatMoney, formatShortDate, todayInArgentina } from '@/lib/format'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos cargar el dashboard.'
}

export function DashboardPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [movements, setMovements] = useState<FinancialMovementRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const firstName = user?.fullName.split(' ')[0] ?? 'equipo'

  useEffect(() => {
    let cancelled = false
    void Promise.all([listClients(), listProjects(), listMeetings(), isOwner ? listFinancialMovements() : Promise.resolve<FinancialMovementRecord[]>([])])
      .then(([nextClients, nextProjects, nextMeetings, nextMovements]) => {
        if (cancelled) return
        setClients(nextClients)
        setProjects(nextProjects)
        setMeetings(nextMeetings)
        setMovements(nextMovements)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [isOwner])

  const activeProjects = projects.filter((project) => project.status === 'active')
  const todayItems = useMemo(() => {
    const today = todayInArgentina()
    return sortCalendarItems(buildCalendarItems(meetings, projects, movements).filter((item) => item.date === today))
  }, [meetings, projects, movements])

  const todoTasks = useMemo(() => projects
    .flatMap((project) => project.tasks
      .filter((task) => task.status === 'todo')
      .map((task) => ({ id: task.id, title: task.title, createdAt: task.createdAt, projectId: project.id, projectName: project.name, clientName: project.clientName ?? 'Interno' })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5), [projects])

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">{formatLongDate()}</p>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Buen día, {firstName}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Este es el pulso real de la agencia para hoy.</p>
        </div>
        <Button asChild><Link to="/proyectos">Ver proyectos <ArrowRight className="size-4" /></Link></Button>
      </header>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo actualizar el resumen</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principales" aria-busy={isLoading}>
        <KpiCard label="Clientes activos" value={isLoading ? '…' : String(clients.filter((client) => client.status === 'active').length)} helper={`${clients.length} clientes en total`} icon={Users} tone="green" to="/clientes" />
        <KpiCard label="Proyectos en curso" value={isLoading ? '…' : String(activeProjects.length)} helper={`${activeProjects.filter((project) => project.deadline).length} con deadline`} icon={FolderKanban} tone="blue" to="/proyectos" />
        <KpiCard label="Ingresos" value="—" helper="Se habilita con Finanzas" icon={CircleDollarSign} tone="orange" to="/finanzas" />
        <KpiCard label="Por cobrar" value="—" helper="Se habilita con cuotas" icon={ReceiptText} tone="plum" to="/finanzas" />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_0.8fr]">
        <Card className="border-border/70 py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
            <div><p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">En movimiento</p><CardTitle className="mt-1 text-base">Proyectos activos</CardTitle></div>
            <Button asChild variant="ghost" size="sm"><Link to="/proyectos">Ver todos <ArrowRight className="size-3.5" /></Link></Button>
          </CardHeader>
          <CardContent className="px-5 py-1">
            {isLoading && <div className="space-y-3 py-5"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}
            {!isLoading && activeProjects.slice(0, 3).map((project) => (
              <div className="grid min-h-20 grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 last:border-0 md:grid-cols-[3px_minmax(150px,1.4fr)_80px_85px_minmax(100px,.8fr)_90px]" key={project.id}>
                <span className="h-9 rounded-full bg-primary" />
                <div className="min-w-0"><strong className="block truncate text-sm font-medium">{project.name}</strong><span className="mt-1 block truncate text-xs text-muted-foreground">{project.clientName}</span></div>
                <StatusBadge status={project.status} />
                <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex"><Clock3 className="size-3.5" /> {project.deadline ? formatShortDate(project.deadline) : 'Sin fecha'}</div>
                <div className="hidden items-center gap-2 md:flex"><Progress value={project.progress} className="h-1.5" /><span className="font-mono text-[10px] text-muted-foreground">{project.progress}%</span></div>
                <strong className="hidden text-right font-mono text-xs font-medium md:block">{project.budget !== null && project.currency ? formatMoney(project.budget, project.currency) : '—'}</strong>
              </div>
            ))}
            {!isLoading && activeProjects.length === 0 && <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">No hay proyectos activos todavía.</div>}
          </CardContent>
        </Card>

        <Card className="border-border/70 py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4"><div><p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">Agenda</p><CardTitle className="mt-1 text-base">Hoy</CardTitle></div><CalendarClock className="size-5 text-muted-foreground" /></CardHeader>
          <CardContent className="space-y-1.5 px-5 py-4">
            {isLoading && <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}
            {!isLoading && todayItems.map((item) => <CalendarItemRow item={item} key={item.id} />)}
            {!isLoading && todayItems.length === 0 && <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">Nada para hoy pa</div>}
          </CardContent>
          <Separator />
          <Button asChild variant="ghost" className="h-11 w-full rounded-t-none"><Link to="/calendario">Ver calendario <ArrowRight className="size-3.5" /></Link></Button>
        </Card>
      </div>

      <Card className="border-border/70 py-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4"><div><p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">Pendiente</p><CardTitle className="mt-1 text-base">Últimas tareas por hacer</CardTitle></div><ListTodo className="size-5 text-muted-foreground" /></CardHeader>
        <CardContent className="px-5 py-1">
          {isLoading && <div className="space-y-3 py-5"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}
          {!isLoading && todoTasks.map((task) => (
            <Link to={`/proyectos/${task.projectId}`} className="grid min-h-16 grid-cols-[8px_1fr_auto] items-center gap-3 border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40" key={task.id}>
              <span className="size-2 rounded-full bg-zinc-400" />
              <div className="min-w-0"><strong className="block truncate text-sm font-medium">{task.title}</strong><span className="mt-0.5 block truncate text-xs text-muted-foreground">{task.projectName} · {task.clientName}</span></div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
          {!isLoading && todoTasks.length === 0 && <div className="grid min-h-32 place-items-center text-sm text-muted-foreground">No hay tareas por hacer.</div>}
        </CardContent>
      </Card>
    </div>
  )
}
