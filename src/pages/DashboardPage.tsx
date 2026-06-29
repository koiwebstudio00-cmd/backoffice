import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  ReceiptText,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { KpiCard } from '@/components/KpiCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { listClients, listProjects, type ClientRecord, type ProjectRecord } from '@/data/repository'
import { formatLongDate, formatMoney, formatShortDate } from '@/lib/format'

interface AgendaItem {
  id: string
  date: string
  title: string
  meta: string
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos cargar el dashboard.'
}

function agendaDateParts(date: string): { day: string; month: string } {
  const parsed = new Date(`${date}T12:00:00`)
  return {
    day: new Intl.DateTimeFormat('es-AR', { day: '2-digit' }).format(parsed),
    month: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(parsed).replace('.', '').toUpperCase(),
  }
}

export function DashboardPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const firstName = user?.fullName.split(' ')[0] ?? 'equipo'

  useEffect(() => {
    let cancelled = false
    void Promise.all([listClients(), listProjects()])
      .then(([nextClients, nextProjects]) => {
        if (cancelled) return
        setClients(nextClients)
        setProjects(nextProjects)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(getErrorMessage(loadError))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const activeProjects = projects.filter((project) => project.status === 'active')
  const agenda = useMemo<AgendaItem[]>(() => {
    const projectDeadlines = projects.flatMap((project) => project.deadline ? [{ id: `project-${project.id}`, date: project.deadline, title: `Entrega · ${project.name}`, meta: project.clientName }] : [])
    const taskDeadlines = projects.flatMap((project) => project.tasks.flatMap((task) => task.dueDate && task.status !== 'done' ? [{ id: `task-${task.id}`, date: task.dueDate, title: task.title, meta: project.name }] : []))
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Tucuman' }).format(new Date())
    return [...projectDeadlines, ...taskDeadlines].filter((item) => item.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  }, [projects])

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
        <KpiCard label="Clientes activos" value={isLoading ? '…' : String(clients.filter((client) => client.status === 'active').length)} helper={`${clients.length} clientes en total`} icon={Users} tone="green" />
        <KpiCard label="Proyectos en curso" value={isLoading ? '…' : String(activeProjects.length)} helper={`${activeProjects.filter((project) => project.deadline).length} con deadline`} icon={FolderKanban} tone="blue" />
        <KpiCard label="Ingresos" value="—" helper="Se habilita con Finanzas" icon={CircleDollarSign} tone="orange" />
        <KpiCard label="Por cobrar" value="—" helper="Se habilita con cuotas" icon={ReceiptText} tone="plum" />
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
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4"><div><p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">Próximamente</p><CardTitle className="mt-1 text-base">Agenda</CardTitle></div><CalendarClock className="size-5 text-muted-foreground" /></CardHeader>
          <CardContent className="px-5 py-1">
            {agenda.map((item) => {
              const date = agendaDateParts(item.date)
              return <div className="grid min-h-20 grid-cols-[40px_1fr] items-center gap-3 border-b border-border/60 last:border-0" key={item.id}><time className="text-center" dateTime={item.date}><strong className="block font-mono text-lg leading-none">{date.day}</strong><span className="mt-1 block text-[9px] font-semibold tracking-wider text-primary">{date.month}</span></time><div className="min-w-0 border-l-2 border-primary/70 pl-3"><strong className="block truncate text-xs font-medium">{item.title}</strong><span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.meta}</span></div></div>
            })}
            {!isLoading && agenda.length === 0 && <div className="grid min-h-40 place-items-center text-sm text-muted-foreground">No hay deadlines próximos.</div>}
          </CardContent>
          <Separator />
          <Button asChild variant="ghost" className="h-11 w-full rounded-t-none"><Link to="/proyectos">Gestionar deadlines <ArrowRight className="size-3.5" /></Link></Button>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/[0.055] py-0 shadow-none">
        <CardContent className="flex items-center gap-4 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"><CircleDollarSign className="size-5" /></div><div className="min-w-0 flex-1"><span className="text-[10px] font-semibold tracking-[0.14em] text-primary uppercase">Próximo módulo</span><strong className="mt-1 block text-sm font-medium">Los indicadores de rentabilidad se activarán cuando incorporemos transacciones reales.</strong></div><Button asChild variant="ghost" className="hidden sm:flex"><Link to="/finanzas">Ver alcance <ArrowRight className="size-4" /></Link></Button></CardContent>
      </Card>
    </div>
  )
}
