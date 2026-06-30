import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask, updateTask, type TaskRecord, type TaskStatus } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'

const statusOptions: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'Por hacer' },
  { id: 'doing', label: 'En curso' },
  { id: 'review', label: 'En revisión' },
  { id: 'done', label: 'Listo' },
]

export interface TaskProjectOption {
  id: string
  name: string
}

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTask: TaskRecord | null
  defaultProjectId?: string
  projects?: TaskProjectOption[]
  onSaved: () => void | Promise<void>
}

export function TaskFormDialog({
  open,
  onOpenChange,
  editingTask,
  defaultProjectId,
  projects,
  onSaved,
}: TaskFormDialogProps) {
  const [form, setForm] = useState(() => ({
    projectId: editingTask?.projectId ?? defaultProjectId ?? projects?.[0]?.id ?? '',
    title: editingTask?.title ?? '',
    status: editingTask?.status ?? ('todo' as TaskStatus),
    dueDate: editingTask?.dueDate ?? '',
  }))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showProjectPicker = !editingTask && Boolean(projects && projects.length > 0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const projectId = editingTask?.projectId ?? form.projectId
    if (!projectId) {
      setError('Elegí un proyecto para la tarea.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const input = { projectId, title: form.title, status: form.status, dueDate: form.dueDate }
      if (editingTask) await updateTask(editingTask.id, input)
      else await createTask(input)
      onOpenChange(false)
      await onSaved()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent><DialogHeader><DialogTitle>{editingTask ? 'Editar tarea' : 'Agregar tarea'}</DialogTitle><DialogDescription>{editingTask ? 'Actualizá el trabajo, la columna y su vencimiento.' : 'Creá una nueva tarea para el proyecto.'}</DialogDescription></DialogHeader><form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
        {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        {showProjectPicker && <div className="grid gap-2"><Label>Proyecto *</Label><Select required value={form.projectId} onValueChange={(value) => setForm({ ...form, projectId: value })}><SelectTrigger className="w-full"><SelectValue placeholder="Elegí un proyecto" /></SelectTrigger><SelectContent>{projects!.map((project) => <SelectItem value={project.id} key={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>}
        <div className="grid gap-2"><Label htmlFor="task-title">Título *</Label><Input id="task-title" required maxLength={240} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Columna</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as TaskStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{statusOptions.map((option) => <SelectItem value={option.id} key={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="task-due">Vencimiento</Label><Input id="task-due" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div></div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editingTask ? 'Guardar cambios' : 'Guardar tarea'}</Button></div>
      </form></DialogContent>
    </Dialog>
  )
}
