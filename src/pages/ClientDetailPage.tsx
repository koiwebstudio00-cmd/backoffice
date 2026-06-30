import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  FolderKanban,
  ListTodo,
  Mail,
  Pencil,
  Phone,
  Plus,
  Repeat,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { CredentialsPanel } from '@/components/CredentialsPanel'
import { MilestoneSection } from '@/components/MilestoneSection'
import { NotesPanel } from '@/components/NotesPanel'
import { StatusBadge } from '@/components/StatusBadge'
import { MovementFormDialog } from '@/components/forms/MovementFormDialog'
import { ProjectFormDialog } from '@/components/forms/ProjectFormDialog'
import { TaskFormDialog } from '@/components/forms/TaskFormDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getClientById,
  listFinancialMovements,
  listNotes,
  listProjects,
  listTasksByClient,
  type ClientRecord,
  type ClientTaskRecord,
  type FinancialMovementRecord,
  type NoteRecord,
  type ProjectRecord,
  type TaskStatus,
} from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime, formatMoney, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const currencies = ['ARS', 'USD', 'USDT'] as const

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: 'Por hacer',
  doing: 'En curso',
  review: 'Revisión',
  done: 'Terminado',
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-border/70 py-0 shadow-none">
      <CardContent className="p-4">
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</span>
        <strong className="mt-2 block font-mono text-xl font-semibold">{value}</strong>
        {hint && <small className="mt-1 block text-xs text-muted-foreground">{hint}</small>}
      </CardContent>
    </Card>
  )
}

export function ClientDetailPage() {
  const { clientId = '' } = useParams()
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [client, setClient] = useState<ClientRecord | null>(null)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<ClientTaskRecord[]>([])
  const [movements, setMovements] = useState<FinancialMovementRecord[]>([])
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [projectDialog, setProjectDialog] = useState<{ project: ProjectRecord | null } | null>(null)
  const [movementDialog, setMovementDialog] = useState<{ movement: FinancialMovementRecord | null } | null>(null)
  const [taskDialog, setTaskDialog] = useState<{ task: ClientTaskRecord | null } | null>(null)

  const loadAll = useCallback(async () => {
    const [nextProjects, nextTasks, nextNotes, nextMovements] = await Promise.all([
      listProjects(clientId),
      listTasksByClient(clientId),
      listNotes(clientId),
      isOwner ? listFinancialMovements(clientId) : Promise.resolve<FinancialMovementRecord[]>([]),
    ])
    setProjects(nextProjects)
    setTasks(nextTasks)
    setNotes(nextNotes)
    setMovements(nextMovements)
  }, [clientId, isOwner])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      getClientById(clientId),
      listProjects(clientId),
      listTasksByClient(clientId),
      listNotes(clientId),
      isOwner ? listFinancialMovements(clientId) : Promise.resolve<FinancialMovementRecord[]>([]),
    ]).then(([nextClient, nextProjects, nextTasks, nextNotes, nextMovements]) => {
      if (cancelled) return
      setClient(nextClient)
      setProjects(nextProjects)
      setTasks(nextTasks)
      setNotes(nextNotes)
      setMovements(nextMovements)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [clientId, isOwner])

  const metrics = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === 'active').length
    const avgProgress = projects.length
      ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length)
      : 0
    const openTasks = tasks.filter((task) => task.status !== 'done').length
    const upcoming = [
      ...projects.map((project) => project.deadline),
      ...projects.flatMap((project) => project.milestones.filter((milestone) => !milestone.done).map((milestone) => milestone.dueDate)),
      ...tasks.map((task) => task.dueDate),
    ].filter((date): date is string => Boolean(date)).sort()
    const today = new Date().toISOString().slice(0, 10)
    const nextDate = upcoming.find((date) => date >= today) ?? upcoming.at(-1) ?? null
    return { activeProjects, avgProgress, openTasks, nextDate }
  }, [projects, tasks])

  const pendingByCurrency = useMemo(() => currencies.map((currency) => {
    const matching = movements.filter((movement) => movement.currency === currency && movement.status === 'pending')
    return {
      currency,
      income: matching.filter((movement) => movement.type === 'income').reduce((sum, movement) => sum + movement.amount, 0),
      expense: matching.filter((movement) => movement.type === 'expense').reduce((sum, movement) => sum + movement.amount, 0),
    }
  }).filter((entry) => entry.income !== 0 || entry.expense !== 0), [movements])

  const tasksByStatus = useMemo(() => (['todo', 'doing', 'review', 'done'] as TaskStatus[]).map((status) => ({
    status,
    items: tasks.filter((task) => task.status === status),
  })), [tasks])

  const projectClientOptions = useMemo(() => (client ? [{ id: client.id, name: client.name, company: client.company }] : []), [client])
  const movementClientOptions = useMemo(() => (client ? [{ id: client.id, name: client.company || client.name }] : []), [client])
  const movementProjectOptions = useMemo(() => projects.map((project) => ({ id: project.id, clientId: project.clientId, name: project.name })), [projects])
  const taskProjectOptions = useMemo(() => projects.map((project) => ({ id: project.id, name: project.name })), [projects])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-3 sm:grid-cols-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/clientes"><ArrowLeft /> Volver a clientes</Link></Button>
        <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo cargar el cliente</AlertTitle><AlertDescription>{error ?? 'El cliente no existe o no tenés acceso.'}</AlertDescription></Alert>
      </div>
    )
  }

  const identity = client.company || client.name

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground"><Link to="/clientes"><ArrowLeft /> Clientes</Link></Button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{identity.slice(0, 2).toUpperCase()}</span>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5"><h1 className="text-2xl font-semibold tracking-[-0.03em]">{client.name}</h1><StatusBadge status={client.status} /></div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Building2 className="size-3.5" /> {client.company || 'Sin empresa'}</span>
              {client.email && <a className="inline-flex items-center gap-1.5 hover:text-primary" href={`mailto:${client.email}`}><Mail className="size-3.5" /> {client.email}</a>}
              {client.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" /> {client.phone}</span>}
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen del cliente">
        <MetricCard label="Proyectos" value={String(projects.length)} hint={`${metrics.activeProjects} activos`} />
        <MetricCard label="Progreso promedio" value={`${metrics.avgProgress}%`} />
        <MetricCard label="Tareas abiertas" value={String(metrics.openTasks)} hint={`${tasks.length} en total`} />
        <MetricCard label="Próxima fecha" value={metrics.nextDate ? formatShortDate(metrics.nextDate) : '—'} />
      </section>

      <Tabs defaultValue="resumen">
        <TabsList className="flex w-full flex-wrap justify-start sm:w-fit">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="proyectos">Proyectos</TabsTrigger>
          {isOwner && <TabsTrigger value="pagos">Pagos</TabsTrigger>}
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
          {isOwner && <TabsTrigger value="credenciales">Credenciales</TabsTrigger>}
        </TabsList>

        {/* RESUMEN */}
        <TabsContent value="resumen" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70 shadow-none">
              <CardHeader><CardTitle className="text-sm">Perfil</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {client.notes ? <p className="leading-6 whitespace-pre-wrap text-muted-foreground">{client.notes}</p> : <p className="text-xs text-muted-foreground">Sin descripción cargada. Editá el cliente desde la pestaña Clientes para agregar un perfil.</p>}
                <p className="text-xs text-muted-foreground">Última actividad: {formatDateTime(client.updatedAt)}</p>
              </CardContent>
            </Card>
            <Card className="border-border/70 shadow-none">
              <CardHeader><CardTitle className="text-sm">Últimas notas</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {notes.slice(0, 3).map((note) => (
                  <div className="border-t border-border/70 pt-3 text-xs first:border-0 first:pt-0" key={note.id}>
                    <p className="line-clamp-2 leading-5">{note.body}</p>
                    <small className="mt-1 block text-[10px] text-muted-foreground">{note.authorName ?? 'Equipo'} · {formatDateTime(note.createdAt)}</small>
                  </div>
                ))}
                {notes.length === 0 && <p className="text-xs text-muted-foreground">Todavía no hay notas para este cliente.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PROYECTOS */}
        <TabsContent value="proyectos" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{projects.length} proyecto{projects.length === 1 ? '' : 's'}</p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm"><Link to="/proyectos"><FolderKanban /> Ver en Proyectos</Link></Button>
              <Button size="sm" onClick={() => setProjectDialog({ project: null })}><Plus /> Nuevo proyecto</Button>
            </div>
          </div>
          {projects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <Card className="border-border/70 shadow-none" key={project.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div><Link to={`/proyectos/${project.id}`} className="text-sm font-medium hover:text-primary hover:underline">{project.name}</Link><small className="block text-xs text-muted-foreground">{project.type}</small></div>
                      <div className="flex items-center gap-1.5"><StatusBadge status={project.status} /><Button variant="ghost" size="icon-sm" aria-label={`Editar ${project.name}`} onClick={() => setProjectDialog({ project })}><Pencil /></Button></div>
                    </div>
                    <div className="space-y-1.5"><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Progreso</span><span className="font-mono">{project.progress}%</span></div><Progress value={project.progress} /></div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" /> {project.deadline ? `Entrega: ${formatShortDate(project.deadline)}` : 'Sin deadline'}</span>
                      {isOwner && project.budget !== null && project.currency && <span className="font-mono text-foreground">{formatMoney(project.budget, project.currency)}</span>}
                    </div>
                    <div className="border-t border-border/70 pt-3"><MilestoneSection projectId={project.id} milestones={project.milestones} isOwner={isOwner} onChanged={loadAll} /></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : <EmptyState icon={FolderKanban} text="Este cliente todavía no tiene proyectos." />}
        </TabsContent>

        {/* PAGOS */}
        {isOwner && (
          <TabsContent value="pagos" className="space-y-4">
            {pendingByCurrency.length > 0 && (
              <section className="grid gap-3 sm:grid-cols-3">
                {pendingByCurrency.map((entry) => (
                  <Card className="border-border/70 py-0 shadow-none" key={entry.currency}>
                    <CardContent className="p-4">
                      <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground">{entry.currency} · PENDIENTE</span>
                      <div className="mt-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">Por cobrar</span><b className="font-mono">{formatMoney(entry.income, entry.currency)}</b></div>
                      <div className="mt-1 flex items-center justify-between text-xs"><span className="text-muted-foreground">Por pagar</span><b className="font-mono">{formatMoney(entry.expense, entry.currency)}</b></div>
                    </CardContent>
                  </Card>
                ))}
              </section>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{movements.length} movimiento{movements.length === 1 ? '' : 's'}</p>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/finanzas">Ver en Finanzas</Link></Button>
                <Button size="sm" onClick={() => setMovementDialog({ movement: null })}><Plus /> Nuevo movimiento</Button>
              </div>
            </div>
            {movements.length > 0 ? (
              <Card className="overflow-hidden border-border/70 py-0 shadow-none">
                <Table>
                  <TableHeader><TableRow><TableHead>Movimiento</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Importe</TableHead><TableHead className="w-10"><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {movements.map((movement) => {
                      const TypeIcon = movement.type === 'income' ? ArrowDownLeft : ArrowUpRight
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', movement.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}><TypeIcon className="size-4" /></span>
                              <div><div className="flex items-center gap-1.5"><strong className="text-sm font-medium">{movement.concept}</strong>{movement.recurrence === 'monthly' && <Badge variant="secondary" className="gap-1 text-[9px]"><Repeat className="size-2.5" /> Mensual</Badge>}</div><small className="text-xs text-muted-foreground">{movement.category}{movement.projectName ? ` · ${movement.projectName}` : ''}</small></div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatShortDate(movement.occurredOn)}</TableCell>
                          <TableCell className={cn('text-right font-mono text-xs font-semibold', movement.type === 'expense' && 'text-destructive')}>{movement.type === 'expense' ? '−' : '+'}{formatMoney(movement.amount, movement.currency)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon-sm" aria-label={`Editar ${movement.concept}`} onClick={() => setMovementDialog({ movement })}><Pencil /></Button></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Card>
            ) : <EmptyState icon={ArrowDownLeft} text="Sin movimientos asociados a este cliente." />}
          </TabsContent>
        )}

        {/* TAREAS */}
        <TabsContent value="tareas" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{metrics.openTasks} abierta{metrics.openTasks === 1 ? '' : 's'} de {tasks.length}</p>
            <Button size="sm" disabled={projects.length === 0} title={projects.length === 0 ? 'Primero creá un proyecto' : undefined} onClick={() => setTaskDialog({ task: null })}><Plus /> Nueva tarea</Button>
          </div>
          {tasks.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {tasksByStatus.map((column) => (
                <div className="space-y-2" key={column.status}>
                  <div className="flex items-center justify-between px-1"><span className="text-xs font-semibold">{taskStatusLabels[column.status]}</span><Badge variant="secondary" className="text-[10px]">{column.items.length}</Badge></div>
                  {column.items.map((task) => (
                    <Card className="border-border/70 shadow-none" key={task.id}>
                      <CardContent className="space-y-1.5 p-3">
                        <div className="flex items-start justify-between gap-1.5">
                          <strong className="block text-xs font-medium leading-4">{task.title}</strong>
                          <Button variant="ghost" size="icon-xs" className="-mt-1 -mr-1 shrink-0" aria-label={`Editar ${task.title}`} onClick={() => setTaskDialog({ task })}><Pencil /></Button>
                        </div>
                        <small className="block text-[10px] text-muted-foreground">{task.projectName}</small>
                        {task.dueDate && <small className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><CalendarClock className="size-3" /> {formatShortDate(task.dueDate)}</small>}
                      </CardContent>
                    </Card>
                  ))}
                  {column.items.length === 0 && <p className="px-1 text-[10px] text-muted-foreground">—</p>}
                </div>
              ))}
            </div>
          ) : <EmptyState icon={ListTodo} text="Este cliente no tiene tareas en sus proyectos." />}
        </TabsContent>

        {/* NOTAS */}
        <TabsContent value="notas">
          <NotesPanel clientId={clientId} currentUserId={user?.id} isOwner={isOwner} projects={taskProjectOptions} onChanged={loadAll} />
        </TabsContent>

        {/* CREDENCIALES */}
        {isOwner && (
          <TabsContent value="credenciales">
            <CredentialsPanel clientId={clientId} userEmail={user?.email ?? ''} />
          </TabsContent>
        )}
      </Tabs>

      {projectDialog && (
        <ProjectFormDialog
          open
          onOpenChange={(open) => { if (!open) setProjectDialog(null) }}
          clients={projectClientOptions}
          editingProject={projectDialog.project}
          lockedClientId={clientId}
          isOwner={isOwner}
          onSaved={loadAll}
        />
      )}

      {movementDialog && (
        <MovementFormDialog
          open
          onOpenChange={(open) => { if (!open) setMovementDialog(null) }}
          editingMovement={movementDialog.movement}
          clients={movementClientOptions}
          projects={movementProjectOptions}
          lockedClientId={clientId}
          onSaved={loadAll}
        />
      )}

      {taskDialog && (
        <TaskFormDialog
          open
          onOpenChange={(open) => { if (!open) setTaskDialog(null) }}
          editingTask={taskDialog.task}
          projects={taskProjectOptions}
          onSaved={loadAll}
        />
      )}

    </div>
  )
}

function EmptyState({ icon: Icon, text, action }: { icon: typeof FolderKanban; text: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-2xl border border-border/70 p-8 text-center">
      <div><Icon className="mx-auto mb-3 size-5 text-muted-foreground" /><span className="block text-xs text-muted-foreground">{text}</span>{action}</div>
    </div>
  )
}
