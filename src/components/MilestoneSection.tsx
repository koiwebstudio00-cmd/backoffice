import { AlertCircle, CalendarClock, Flag, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createMilestone, deleteMilestone, setMilestoneDone, updateMilestone, type MilestoneRecord } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatShortDate, todayInArgentina } from '@/lib/format'
import { cn } from '@/lib/utils'

interface MilestoneSectionProps {
  projectId: string
  milestones: MilestoneRecord[]
  isOwner: boolean
  onChanged: () => void | Promise<void>
}

export function MilestoneSection({ projectId, milestones, isOwner, onChanged }: MilestoneSectionProps) {
  const [dialog, setDialog] = useState<{ milestone: MilestoneRecord | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MilestoneRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = todayInArgentina()

  async function toggleDone(milestone: MilestoneRecord) {
    setBusyId(milestone.id)
    setError(null)
    try {
      await setMilestoneDone(milestone.id, !milestone.done)
      await onChanged()
    } catch (toggleError) {
      setError(getErrorMessage(toggleError))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deleteMilestone(pendingDelete.id)
      setPendingDelete(null)
      await onChanged()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-medium"><Flag className="size-3.5 text-primary" /> Hitos</h3>
        <Button variant="outline" size="sm" onClick={() => setDialog({ milestone: null })}><Plus /> Agregar hito</Button>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {milestones.length > 0 ? (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
          {milestones.map((milestone) => {
            const overdue = !milestone.done && milestone.dueDate < today
            return (
              <li className="flex items-center gap-3 bg-card p-3" key={milestone.id}>
                <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={milestone.done} disabled={busyId === milestone.id} onChange={() => void toggleDone(milestone)} aria-label={`Marcar ${milestone.title}`} />
                <div className="min-w-0 flex-1">
                  <strong className={cn('block truncate text-sm font-medium', milestone.done && 'text-muted-foreground line-through')}>{milestone.title}</strong>
                  <small className={cn('flex items-center gap-1 text-[11px] text-muted-foreground', overdue && 'text-destructive')}><CalendarClock className="size-3" /> {formatShortDate(milestone.dueDate)}{overdue && ' · vencido'}</small>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${milestone.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setDialog({ milestone })}><Pencil /> Editar</DropdownMenuItem>{isOwner && <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(milestone)}><Trash2 /> Eliminar</DropdownMenuItem>}</DropdownMenuContent>
                </DropdownMenu>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">Sin hitos cargados. Agregá las etapas del desarrollo con su fecha.</p>
      )}

      {dialog && (
        <MilestoneFormDialog
          open
          onOpenChange={(open) => { if (!open) setDialog(null) }}
          projectId={projectId}
          editing={dialog.milestone}
          onSaved={onChanged}
        />
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar este hito?</AlertDialogTitle><AlertDialogDescription>“{pendingDelete?.title}” se eliminará de forma permanente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar hito'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface MilestoneFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  editing: MilestoneRecord | null
  onSaved: () => void | Promise<void>
}

function MilestoneFormDialog({ open, onOpenChange, projectId, editing, onSaved }: MilestoneFormDialogProps) {
  const [form, setForm] = useState(() => ({ title: editing?.title ?? '', dueDate: editing?.dueDate ?? '' }))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      if (editing) await updateMilestone(editing.id, { title: form.title, dueDate: form.dueDate })
      else await createMilestone({ projectId, title: form.title, dueDate: form.dueDate })
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
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Editar hito' : 'Agregar hito'}</DialogTitle><DialogDescription>Una etapa del desarrollo con su fecha objetivo.</DialogDescription></DialogHeader>
        <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="grid gap-2"><Label htmlFor="milestone-title">Título *</Label><Input id="milestone-title" required maxLength={160} placeholder="Ej. Entrega del MVP" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="milestone-due">Fecha *</Label><Input id="milestone-due" required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar hito'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
