import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  ListTodo,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { CredentialsPanel } from '@/components/CredentialsPanel'
import { EnvFilesPanel } from '@/components/EnvFilesPanel'
import { MilestoneSection } from '@/components/MilestoneSection'
import { NotesPanel } from '@/components/NotesPanel'
import { StatusBadge } from '@/components/StatusBadge'
import { MovementFormDialog } from '@/components/forms/MovementFormDialog'
import { TaskFormDialog } from '@/components/forms/TaskFormDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MoreHorizontal } from 'lucide-react'
import {
  deleteTask,
  getProjectById,
  listMovementsByProject,
  updateTaskStatus,
  type FinancialMovementRecord,
  type ProjectRecord,
  type TaskRecord,
  type TaskStatus,
} from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatMoney, formatShortDate, todayInArgentina } from '@/lib/format'
import { cn } from '@/lib/utils'

const currencies = ['ARS', 'USD', 'USDT'] as const
const taskColumns: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'Por hacer' },
  { id: 'doing', label: 'En curso' },
  { id: 'review', label: 'En revisión' },
  { id: 'done', label: 'Listo' },
]

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

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [movements, setMovements] = useState<FinancialMovementRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [taskDialog, setTaskDialog] = useState<{ task: TaskRecord | null } | null>(null)
  const [movementDialog, setMovementDialog] = useState<{ movement: FinancialMovementRecord | null } | null>(null)
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskRecord | null>(null)
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  const loadProject = useCallback(async () => {
    const [nextProject, nextMovements] = await Promise.all([
      getProjectById(projectId),
      isOwner ? listMovementsByProject(projectId) : Promise.resolve<FinancialMovementRecord[]>([]),
    ])
    setProject(nextProject)
    setMovements(nextMovements)
  }, [projectId, isOwner])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      getProjectById(projectId),
      isOwner ? listMovementsByProject(projectId) : Promise.resolve<FinancialMovementRecord[]>([]),
    ]).then(([nextProject, nextMovements]) => {
      if (cancelled) return
      setProject(nextProject)
      setMovements(nextMovements)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [projectId, isOwner])

  const tasksByStatus = useMemo(() => taskColumns.map((column) => ({
    ...column,
    items: (project?.tasks ?? []).filter((task) => task.status === column.id),
  })), [project])

  const pendingByCurrency = useMemo(() => currencies.map((currency) => {
    const matching = movements.filter((movement) => movement.currency === currency && movement.status === 'pending')
    return {
      currency,
      income: matching.filter((movement) => movement.type === 'income').reduce((sum, movement) => sum + movement.amount, 0),
      expense: matching.filter((movement) => movement.type === 'expense').reduce((sum, movement) => sum + movement.amount, 0),
    }
  }).filter((entry) => entry.income !== 0 || entry.expense !== 0), [movements])

  const nextDate = useMemo(() => {
    if (!project) return null
    const today = todayInArgentina()
    const dates = [
      project.deadline,
      ...project.milestones.filter((milestone) => !milestone.done).map((milestone) => milestone.dueDate),
      ...project.tasks.map((task) => task.dueDate),
    ].filter((date): date is string => Boolean(date)).sort()
    return dates.find((date) => date >= today) ?? dates.at(-1) ?? null
  }, [project])

  async function handleTaskStatusChange(taskId: string, status: TaskStatus) {
    setUpdatingTaskId(taskId)
    setError(null)
    try {
      await updateTaskStatus(taskId, status)
      await loadProject()
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function handleTaskDelete() {
    if (!taskPendingDelete) return
    setIsDeletingTask(true)
    try {
      await deleteTask(taskPendingDelete.id)
      setTaskPendingDelete(null)
      await loadProject()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setTaskPendingDelete(null)
    } finally {
      setIsDeletingTask(false)
    }
  }

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

  if (error || !project) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm"><Link to="/proyectos"><ArrowLeft /> Volver a proyectos</Link></Button>
        <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo cargar el proyecto</AlertTitle><AlertDescription>{error ?? 'El proyecto no existe o no tenés acceso.'}</AlertDescription></Alert>
      </div>
    )
  }

  const completedTasks = project.tasks.filter((task) => task.status === 'done').length
  const movementClients = project.clientId ? [{ id: project.clientId, name: project.clientName ?? 'Cliente' }] : []
  const movementProjects = [{ id: project.id, clientId: project.clientId, name: project.name }]

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground"><Link to="/proyectos"><ArrowLeft /> Proyectos</Link></Button>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5"><h1 className="text-2xl font-semibold tracking-[-0.03em]">{project.name}</h1><StatusBadge status={project.status} /><Badge variant="outline" className="text-[10px]">{project.type}</Badge></div>
          {project.clientId
            ? <Link to={`/clientes/${project.clientId}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"><Users className="size-3.5" /> {project.clientName}</Link>
            : <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> Proyecto interno</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => setTaskDialog({ task: null })}><Plus /> Nueva tarea</Button>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen del proyecto">
        <MetricCard label="Progreso" value={`${project.progress}%`} hint={`${completedTasks}/${project.tasks.length} tareas`} />
        <MetricCard label="Tareas abiertas" value={String(project.tasks.length - completedTasks)} />
        <MetricCard label="Próxima fecha" value={nextDate ? formatShortDate(nextDate) : '—'} hint={project.deadline ? `Entrega ${formatShortDate(project.deadline)}` : undefined} />
        <MetricCard label="Presupuesto" value={isOwner && project.budget !== null && project.currency ? formatMoney(project.budget, project.currency) : '—'} />
      </section>

      <Tabs defaultValue="resumen">
        <TabsList className="flex w-full flex-wrap justify-start sm:w-fit">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="hitos">Hitos</TabsTrigger>
          {isOwner && <TabsTrigger value="pagos">Pagos</TabsTrigger>}
          <TabsTrigger value="notas">Notas</TabsTrigger>
          {isOwner && <TabsTrigger value="credenciales">Credenciales</TabsTrigger>}
          {isOwner && <TabsTrigger value="env">Variables de entorno</TabsTrigger>}
        </TabsList>

        {/* RESUMEN */}
        <TabsContent value="resumen" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70 shadow-none">
              <CardHeader><CardTitle className="text-sm">Datos</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span>{project.clientId ? <Link to={`/clientes/${project.clientId}`} className="font-medium hover:text-primary">{project.clientName}</Link> : <span>Interno</span>}</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{project.type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Inicio</span><span>{project.startDate ? formatShortDate(project.startDate) : '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Entrega final</span><span>{project.deadline ? formatShortDate(project.deadline) : '—'}</span></div>
                {isOwner && <div className="flex justify-between"><span className="text-muted-foreground">Presupuesto</span><span className="font-mono">{project.budget !== null && project.currency ? formatMoney(project.budget, project.currency) : '—'}</span></div>}
                <div className="space-y-1.5 pt-2"><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Progreso</span><span className="font-mono">{project.progress}%</span></div><Progress value={project.progress} /></div>
              </CardContent>
            </Card>
            <Card className="border-border/70 shadow-none">
              <CardHeader><CardTitle className="text-sm">Próximos hitos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {project.milestones.filter((milestone) => !milestone.done).slice(0, 4).map((milestone) => (
                  <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs first:border-0 first:pt-0" key={milestone.id}>
                    <span className="truncate">{milestone.title}</span>
                    <span className={cn('shrink-0 font-mono text-[10px] text-muted-foreground', milestone.dueDate < todayInArgentina() && 'text-destructive')}>{formatShortDate(milestone.dueDate)}</span>
                  </div>
                ))}
                {project.milestones.filter((milestone) => !milestone.done).length === 0 && <p className="text-xs text-muted-foreground">Sin hitos pendientes.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAREAS */}
        <TabsContent value="tareas" className="space-y-4">
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => setTaskDialog({ task: null })}><Plus /> Nueva tarea</Button></div>
          {project.tasks.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {tasksByStatus.map((column) => (
                <div className="space-y-2" key={column.id}>
                  <div className="flex items-center justify-between px-1"><span className="text-xs font-semibold">{column.label}</span><Badge variant="secondary" className="text-[10px]">{column.items.length}</Badge></div>
                  {column.items.map((task) => (
                    <Card className="border-border/70 shadow-none" key={task.id}>
                      <CardContent className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-1.5">
                          <strong className="block text-xs font-medium leading-4">{task.title}</strong>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-xs" className="-mt-1 -mr-1 shrink-0" aria-label={`Acciones para ${task.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setTaskDialog({ task })}><Pencil /> Editar</DropdownMenuItem>{isOwner && <DropdownMenuItem variant="destructive" onSelect={() => setTaskPendingDelete(task)}><Trash2 /> Eliminar</DropdownMenuItem>}</DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {task.dueDate && <small className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><CalendarClock className="size-3" /> {formatShortDate(task.dueDate)}</small>}
                        <Select value={task.status} disabled={updatingTaskId === task.id} onValueChange={(value) => void handleTaskStatusChange(task.id, value as TaskStatus)}><SelectTrigger className="h-7 w-full text-[10px]"><SelectValue /></SelectTrigger><SelectContent>{taskColumns.map((option) => <SelectItem value={option.id} key={option.id}>{option.label}</SelectItem>)}</SelectContent></Select>
                      </CardContent>
                    </Card>
                  ))}
                  {column.items.length === 0 && <p className="px-1 text-[10px] text-muted-foreground">—</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center rounded-2xl border border-border/70 p-8 text-center"><div><ListTodo className="mx-auto mb-3 size-5 text-muted-foreground" /><span className="block text-xs text-muted-foreground">Todavía no hay tareas. Agregá la primera para estructurar el desarrollo.</span></div></div>
          )}
        </TabsContent>

        {/* HITOS */}
        <TabsContent value="hitos">
          <Card className="border-border/70 shadow-none"><CardContent className="p-4"><MilestoneSection projectId={project.id} milestones={project.milestones} isOwner={isOwner} onChanged={loadProject} /></CardContent></Card>
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
              <Button size="sm" onClick={() => setMovementDialog({ movement: null })}><Plus /> Nuevo movimiento</Button>
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
                              <div><div className="flex items-center gap-1.5"><strong className="text-sm font-medium">{movement.concept}</strong>{movement.recurrence === 'monthly' && <Badge variant="secondary" className="gap-1 text-[9px]"><Repeat className="size-2.5" /> Mensual</Badge>}</div><small className="text-xs text-muted-foreground">{movement.category}</small></div>
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
            ) : (
              <div className="grid min-h-40 place-items-center rounded-2xl border border-border/70 p-8 text-center"><div><ArrowDownLeft className="mx-auto mb-3 size-5 text-muted-foreground" /><span className="block text-xs text-muted-foreground">Sin movimientos asociados a este proyecto.</span></div></div>
            )}
          </TabsContent>
        )}

        {/* NOTAS */}
        <TabsContent value="notas">
          <NotesPanel clientId={project.clientId ?? undefined} projectId={project.id} currentUserId={user?.id} isOwner={isOwner} />
        </TabsContent>

        {/* CREDENCIALES */}
        {isOwner && (
          <TabsContent value="credenciales">
            <CredentialsPanel clientId={project.clientId ?? undefined} projectId={project.id} userEmail={user?.email ?? ''} />
          </TabsContent>
        )}

        {/* VARIABLES DE ENTORNO */}
        {isOwner && (
          <TabsContent value="env">
            <EnvFilesPanel projectId={project.id} userEmail={user?.email ?? ''} />
          </TabsContent>
        )}
      </Tabs>

      {taskDialog && (
        <TaskFormDialog
          open
          onOpenChange={(open) => { if (!open) setTaskDialog(null) }}
          editingTask={taskDialog.task}
          defaultProjectId={project.id}
          onSaved={loadProject}
        />
      )}

      {movementDialog && (
        <MovementFormDialog
          open
          onOpenChange={(open) => { if (!open) setMovementDialog(null) }}
          editingMovement={movementDialog.movement}
          clients={movementClients}
          projects={movementProjects}
          lockedClientId={project.clientId ?? undefined}
          lockedProjectId={project.id}
          onSaved={loadProject}
        />
      )}

      <AlertDialog open={Boolean(taskPendingDelete)} onOpenChange={(open) => { if (!open && !isDeletingTask) setTaskPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle><AlertDialogDescription>“{taskPendingDelete?.title}” se eliminará de forma permanente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeletingTask}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeletingTask} onClick={(event) => { event.preventDefault(); void handleTaskDelete() }}>{isDeletingTask ? 'Eliminando…' : 'Eliminar tarea'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
