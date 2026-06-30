import { AlertCircle, ArrowUpRight, Building2, CalendarClock, FolderKanban,Hexagon, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { ProjectFormDialog } from '@/components/forms/ProjectFormDialog'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/auth-context'
import { deleteProject, listClients, listProjects, type ClientRecord, type ProjectRecord, type ProjectStatus } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatMoney, formatShortDate } from '@/lib/format'

type StatusFilter = 'all' | ProjectStatus

export function ProjectsPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectDialog, setProjectDialog] = useState<{ project: ProjectRecord | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ProjectRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesQuery = !normalized || project.name.toLowerCase().includes(normalized) || project.type.toLowerCase().includes(normalized) || project.clientName?.toLowerCase().includes(normalized)
      return matchesQuery && (status === 'all' || project.status === status)
    })
  }, [projects, query, status])

  async function handleDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteProject(pendingDelete.id)
      setPendingDelete(null)
      await loadData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Operación" title="Proyectos" description="Todos los proyectos de la agencia, de clientes o internos del estudio." action={<Button onClick={() => setProjectDialog({ project: null })}><Plus className="size-4" /> Nuevo proyecto</Button>} />

      {projectDialog && (
        <ProjectFormDialog
          open
          onOpenChange={(open) => { if (!open) setProjectDialog(null) }}
          clients={clients}
          editingProject={projectDialog.project}
          isOwner={isOwner}
          onSaved={loadData}
        />
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar {pendingDelete?.name}?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. También se eliminarán sus tareas, hitos y datos financieros asociados.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar proyecto'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de proyectos">
        {[
          ['Total', projects.length],
          ['Activos', projects.filter((project) => project.status === 'active').length],
          ['Internos', projects.filter((project) => !project.clientId).length],
          ['Finalizados', projects.filter((project) => project.status === 'done').length],
        ].map(([label, value]) => <Card className="border-border/70 py-0 shadow-none" key={label}><CardContent className="p-4"><span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</span><strong className="mt-2 block font-mono text-xl font-semibold">{value}</strong></CardContent></Card>)}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="search" placeholder="Buscar por nombre, tipo o cliente…" aria-label="Buscar proyectos" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}><SelectTrigger className="w-full sm:ml-auto sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="paused">Pausados</SelectItem><SelectItem value="done">Finalizados</SelectItem></SelectContent></Select>
      </div>

      {isLoading && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>}

      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <Card className="border-border/70 shadow-none transition-colors hover:border-primary/40" key={project.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/proyectos/${project.id}`} className="block truncate text-sm font-medium hover:text-primary hover:underline">{project.name}</Link>
                    <small className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">{project.clientId ? <><Building2 className="size-3 shrink-0" /> {project.clientName}</> : <><Hexagon className="size-3 shrink-0" /> Interno</>}</small>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusBadge status={project.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${project.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to={`/proyectos/${project.id}`}><ArrowUpRight /> Ver detalle</Link></DropdownMenuItem><DropdownMenuItem onSelect={() => setProjectDialog({ project })}><Pencil /> Editar</DropdownMenuItem>{isOwner && <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(project)}><Trash2 /> Eliminar</DropdownMenuItem>}</DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-1.5"><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{project.type}</span><span className="font-mono">{project.progress}%</span></div><Progress value={project.progress} /></div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" /> {project.deadline ? formatShortDate(project.deadline) : 'Sin deadline'}</span>
                  {isOwner && project.budget !== null && project.currency && <span className="font-mono text-foreground">{formatMoney(project.budget, project.currency)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="border-dashed py-0 shadow-none"><CardContent className="grid min-h-56 place-items-center p-8 text-center"><div><FolderKanban className="mx-auto mb-3 size-6 text-muted-foreground" /><strong className="block text-sm">{projects.length === 0 ? 'Todavía no hay proyectos' : 'No encontramos proyectos'}</strong><span className="mt-1 block text-xs text-muted-foreground">{projects.length === 0 ? 'Creá el primero, de un cliente o interno del estudio.' : 'Probá con otro término o estado.'}</span>{projects.length === 0 && <Button className="mt-4" onClick={() => setProjectDialog({ project: null })}><Plus className="size-4" /> Nuevo proyecto</Button>}</div></CardContent></Card>
      )}
    </div>
  )
}
