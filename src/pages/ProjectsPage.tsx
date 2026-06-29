import { AlertCircle, CalendarDays, Check, ChevronDown, Circle, Clock3, Plus } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createProject, createTask, listClients, listProjects, updateTaskStatus, type ClientRecord, type Currency, type ProjectRecord, type ProjectStatus, type TaskStatus } from '@/data/repository'
import { formatMoney, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const columns: { id: TaskStatus; label: string; icon: typeof Circle; tone: string }[] = [
  { id: 'todo', label: 'Por hacer', icon: Circle, tone: 'text-zinc-500 bg-zinc-500/10' },
  { id: 'doing', label: 'En curso', icon: Clock3, tone: 'text-sky-600 bg-sky-500/10 dark:text-sky-400' },
  { id: 'review', label: 'En revisión', icon: ChevronDown, tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400' },
  { id: 'done', label: 'Listo', icon: Check, tone: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' },
]

const initialProjectForm = { clientId: '', name: '', type: '', status: 'active' as ProjectStatus, startDate: '', deadline: '', budget: '', currency: 'USD' as Currency }
const initialTaskForm = { title: '', status: 'todo' as TaskStatus, dueDate: '' }

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos completar la operación.'
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [projectForm, setProjectForm] = useState(initialProjectForm)
  const [taskForm, setTaskForm] = useState(initialTaskForm)

  const loadData = useCallback(async () => {
    try {
      const [nextProjects, nextClients] = await Promise.all([listProjects(), listClients()])
      setError(null)
      setProjects(nextProjects)
      setClients(nextClients)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([listProjects(), listClients()]).then(([nextProjects, nextClients]) => {
      if (cancelled) return
      setProjects(nextProjects)
      setClients(nextClients)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const selectedProject = projects.find(({ id }) => id === selectedProjectId) ?? projects[0]

  function openProjectForm() {
    setProjectForm({ ...initialProjectForm, clientId: clients[0]?.id ?? '' })
    setIsProjectFormOpen(true)
  }

  async function handleProjectSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await createProject({ ...projectForm, budget: Number(projectForm.budget) })
      setProjectForm(initialProjectForm)
      setIsProjectFormOpen(false)
      await loadData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProject) return
    setIsSaving(true)
    setError(null)
    try {
      await createTask({ projectId: selectedProject.id, ...taskForm })
      setTaskForm(initialTaskForm)
      setIsTaskFormOpen(false)
      await loadData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTaskStatusChange(taskId: string, status: TaskStatus) {
    setUpdatingTaskId(taskId)
    setError(null)
    try {
      await updateTaskStatus(taskId, status)
      await loadData()
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingTaskId(null)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Operación" title="Proyectos" description="Seguimiento simple para saber qué sigue y dónde está cada entrega." action={<Button onClick={openProjectForm} disabled={clients.length === 0} title={clients.length === 0 ? 'Primero agregá un cliente' : undefined}><Plus className="size-4" /> Nuevo proyecto</Button>} />

      <Dialog open={isProjectFormOpen} onOpenChange={setIsProjectFormOpen}>
        <DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Agregar proyecto</DialogTitle><DialogDescription>Definí el alcance operativo y el presupuesto inicial.</DialogDescription></DialogHeader><form className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleProjectSubmit}>
          <div className="grid gap-2 lg:col-span-2"><Label>Cliente *</Label><Select required value={projectForm.clientId} onValueChange={(value) => setProjectForm({ ...projectForm, clientId: value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem value={client.id} key={client.id}>{client.company || client.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2 lg:col-span-2"><Label htmlFor="project-name">Nombre *</Label><Input id="project-name" required maxLength={160} value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} /></div>
          <div className="grid gap-2 lg:col-span-2"><Label htmlFor="project-type">Tipo *</Label><Input id="project-type" required maxLength={80} placeholder="Web, mantenimiento, agente IA…" value={projectForm.type} onChange={(event) => setProjectForm({ ...projectForm, type: event.target.value })} /></div>
          <div className="grid gap-2 lg:col-span-2"><Label>Estado</Label><Select value={projectForm.status} onValueChange={(value) => setProjectForm({ ...projectForm, status: value as ProjectStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="done">Finalizado</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="project-start">Inicio</Label><Input id="project-start" type="date" value={projectForm.startDate} onChange={(event) => setProjectForm({ ...projectForm, startDate: event.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="project-deadline">Deadline</Label><Input id="project-deadline" type="date" min={projectForm.startDate || undefined} value={projectForm.deadline} onChange={(event) => setProjectForm({ ...projectForm, deadline: event.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="project-budget">Presupuesto *</Label><Input id="project-budget" required type="number" min="0" step="0.01" value={projectForm.budget} onChange={(event) => setProjectForm({ ...projectForm, budget: event.target.value })} /></div>
          <div className="grid gap-2"><Label>Moneda</Label><Select value={projectForm.currency} onValueChange={(value) => setProjectForm({ ...projectForm, currency: value as Currency })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="ARS">ARS</SelectItem></SelectContent></Select></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-4"><Button type="button" variant="outline" onClick={() => setIsProjectFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar proyecto'}</Button></div>
        </form></DialogContent>
      </Dialog>

      <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
        <DialogContent><DialogHeader><DialogTitle>Agregar tarea</DialogTitle><DialogDescription>{selectedProject ? `Nueva tarea para ${selectedProject.name}.` : 'Creá una nueva tarea.'}</DialogDescription></DialogHeader><form className="grid gap-4 pt-2" onSubmit={handleTaskSubmit}>
          <div className="grid gap-2"><Label htmlFor="task-title">Título *</Label><Input id="task-title" required maxLength={240} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Columna</Label><Select value={taskForm.status} onValueChange={(value) => setTaskForm({ ...taskForm, status: value as TaskStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem value={column.id} key={column.id}>{column.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="task-due">Vencimiento</Label><Input id="task-due" type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></div></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setIsTaskFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar tarea'}</Button></div>
        </form></DialogContent>
      </Dialog>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {isLoading && <div className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-36 w-full" /><Skeleton className="h-72 w-full" /></div>}

      {!isLoading && projects.length === 0 && <Card className="border-dashed py-0 shadow-none"><CardContent className="grid min-h-64 place-items-center p-8 text-center"><div><Circle className="mx-auto mb-3 size-6 text-muted-foreground" /><strong className="block text-sm">Todavía no hay proyectos</strong><span className="mt-1 block text-xs text-muted-foreground">{clients.length === 0 ? 'Primero necesitás cargar un cliente.' : 'Creá el primero para comenzar el seguimiento real.'}</span>{clients.length === 0 ? <Button asChild className="mt-4" variant="outline"><Link to="/clientes">Ir a clientes</Link></Button> : <Button className="mt-4" onClick={openProjectForm}>Crear proyecto</Button>}</div></CardContent></Card>}

      {selectedProject && <>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seleccionar proyecto">{projects.map((project) => <button key={project.id} type="button" role="tab" aria-selected={selectedProject.id === project.id} className={cn('relative min-w-48 rounded-xl border border-border/70 bg-card px-4 py-3 text-left transition-colors hover:border-primary/40', selectedProject.id === project.id && 'border-primary/50 bg-primary/[0.055] shadow-sm before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-primary')} onClick={() => setSelectedProjectId(project.id)}><strong className="block truncate text-xs font-medium">{project.name}</strong><small className="mt-1 block truncate text-[11px] text-muted-foreground">{project.clientName}</small></button>)}</div>

        <Card className="relative overflow-hidden border-primary/20 bg-[#171719] py-0 text-white shadow-none dark:bg-card">
          <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
          <CardContent className="grid gap-8 p-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div><div className="mb-3 flex items-center gap-2"><StatusBadge status={selectedProject.status} /><Badge variant="outline" className="border-white/10 bg-white/5 text-[10px] text-zinc-400">{selectedProject.type}</Badge></div><h2 className="text-2xl font-semibold tracking-[-0.035em]">{selectedProject.name}</h2><p className="mt-1 text-xs text-zinc-400">{selectedProject.clientName}</p></div>
            <div className="grid gap-5 sm:grid-cols-3"><div><span className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Presupuesto</span><strong className="mt-2 block font-mono text-sm">{selectedProject.budget !== null && selectedProject.currency ? formatMoney(selectedProject.budget, selectedProject.currency) : 'Sin cargar'}</strong></div><div><span className="text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Deadline</span><strong className="mt-2 flex items-center gap-1.5 text-sm font-medium"><CalendarDays className="size-4" /> {selectedProject.deadline ? formatShortDate(selectedProject.deadline) : 'Sin fecha'}</strong></div><div><span className="flex justify-between text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">Progreso <b className="text-zinc-300">{selectedProject.progress}%</b></span><Progress className="mt-3 h-1.5 bg-white/10" value={selectedProject.progress} /></div></div>
          </CardContent>
        </Card>

        <div className="flex justify-end"><Button variant="outline" onClick={() => setIsTaskFormOpen(true)}><Plus className="size-4" /> Nueva tarea</Button></div>

        <section className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-4" aria-label={`Tareas de ${selectedProject.name}`}>
          {columns.map(({ id, label, icon: Icon, tone }) => { const columnTasks = selectedProject.tasks.filter((task) => task.status === id); return <Card className="min-w-64 gap-0 border-border/70 bg-muted/35 py-0 shadow-none" key={id}><CardHeader className="flex h-12 flex-row items-center gap-2 border-b border-border/70 px-3"><span className={cn('grid size-7 place-items-center rounded-lg', tone)}><Icon className="size-3.5" /></span><strong className="text-xs font-medium">{label}</strong><Badge variant="secondary" className="ml-auto min-w-5 justify-center px-1.5 font-mono text-[9px]">{columnTasks.length}</Badge></CardHeader><CardContent className="min-h-72 space-y-2 p-2.5">{columnTasks.map((task) => <Card className="gap-0 border-border/70 py-0 shadow-none" key={task.id}><CardContent className="p-3"><Badge variant="secondary" className="mb-3 text-[9px]">Tarea</Badge><strong className="block text-xs font-medium leading-5">{task.title}</strong>{task.dueDate && <time className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" /> {formatShortDate(task.dueDate)}</time>}<Select value={task.status} disabled={updatingTaskId === task.id} onValueChange={(value) => void handleTaskStatusChange(task.id, value as TaskStatus)}><SelectTrigger className="mt-3 h-7 w-full text-[10px]"><SelectValue /></SelectTrigger><SelectContent>{columns.map((column) => <SelectItem value={column.id} key={column.id}>{column.label}</SelectItem>)}</SelectContent></Select></CardContent></Card>)}{columnTasks.length === 0 && <div className="grid min-h-24 place-items-center text-[11px] text-muted-foreground">Sin tareas en esta columna</div>}</CardContent></Card> })}
        </section>
      </>}
    </div>
  )
}
