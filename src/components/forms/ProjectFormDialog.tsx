import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createProject, updateProject, type Currency, type ProjectRecord, type ProjectStatus } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'

export interface ProjectClientOption {
  id: string
  name: string
  company: string | null
}

const initialForm = { clientId: '', name: '', type: '', status: 'active' as ProjectStatus, startDate: '', deadline: '', budget: '', currency: 'USD' as Currency }

function projectToForm(project: ProjectRecord) {
  return {
    clientId: project.clientId ?? '',
    name: project.name,
    type: project.type,
    status: project.status,
    startDate: project.startDate ?? '',
    deadline: project.deadline ?? '',
    budget: project.budget?.toString() ?? '',
    currency: project.currency ?? 'USD' as Currency,
  }
}

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients: ProjectClientOption[]
  editingProject: ProjectRecord | null
  lockedClientId?: string
  isOwner: boolean
  onSaved: () => void | Promise<void>
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  clients,
  editingProject,
  lockedClientId,
  isOwner,
  onSaved,
}: ProjectFormDialogProps) {
  const [form, setForm] = useState(() => (editingProject ? projectToForm(editingProject) : { ...initialForm, clientId: lockedClientId ?? clients[0]?.id ?? '' }))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const hasBudget = isOwner && form.budget.trim() !== ''
      const input = {
        ...form,
        clientId: form.clientId || undefined,
        budget: hasBudget ? Number(form.budget) : undefined,
        currency: hasBudget ? form.currency : undefined,
      }
      if (editingProject) await updateProject(editingProject.id, input)
      else await createProject(input)
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
      <DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{editingProject ? 'Editar proyecto' : 'Agregar proyecto'}</DialogTitle><DialogDescription>{isOwner ? 'Definí el alcance operativo y los datos financieros.' : 'Definí el alcance operativo del proyecto.'}</DialogDescription></DialogHeader><form className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleSubmit}>
        {error && <Alert className="lg:col-span-4" variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="grid gap-2 lg:col-span-2"><Label>Cliente</Label><Select disabled={Boolean(lockedClientId)} value={form.clientId || 'none'} onValueChange={(value) => setForm({ ...form, clientId: value === 'none' ? '' : value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin cliente (interno)</SelectItem>{clients.map((client) => <SelectItem value={client.id} key={client.id}>{client.company || client.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2 lg:col-span-2"><Label htmlFor="project-name">Nombre *</Label><Input id="project-name" required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
        <div className="grid gap-2 lg:col-span-2"><Label htmlFor="project-type">Tipo *</Label><Input id="project-type" required maxLength={80} placeholder="Web, mantenimiento, agente IA…" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} /></div>
        <div className="grid gap-2 lg:col-span-2"><Label>Estado</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as ProjectStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="done">Finalizado</SelectItem></SelectContent></Select></div>
        <div className="grid gap-2"><Label htmlFor="project-start">Inicio</Label><Input id="project-start" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="project-deadline">Deadline</Label><Input id="project-deadline" type="date" min={form.startDate || undefined} value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></div>
        {isOwner && <><div className="grid gap-2"><Label htmlFor="project-budget">Presupuesto</Label><Input id="project-budget" type="number" min="0" step="0.01" placeholder="Opcional" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} /></div>
        <div className="grid gap-2"><Label>Moneda</Label><Select value={form.currency} onValueChange={(value) => setForm({ ...form, currency: value as Currency })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="ARS">ARS</SelectItem><SelectItem value="USDT">USDT</SelectItem></SelectContent></Select></div></>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editingProject ? 'Guardar cambios' : 'Guardar proyecto'}</Button></div>
      </form></DialogContent>
    </Dialog>
  )
}
