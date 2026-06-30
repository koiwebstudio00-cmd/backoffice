import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createMeeting, updateMeeting, type MeetingRecord } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { todayInArgentina } from '@/lib/format'
import { cn } from '@/lib/utils'

const TZ = 'America/Argentina/Tucuman'
const OFFSET = '-03:00'

export interface MeetingProjectOption {
  id: string
  name: string
}

function toArgDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

function toArgTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

interface MeetingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: MeetingRecord | null
  projects: MeetingProjectOption[]
  onSaved: () => void | Promise<void>
  onRequestDelete?: () => void
}

export function MeetingFormDialog({ open, onOpenChange, editing, projects, onSaved, onRequestDelete }: MeetingFormDialogProps) {
  const [form, setForm] = useState(() => ({
    title: editing?.title ?? '',
    date: editing ? toArgDate(editing.startsAt) : todayInArgentina(),
    startTime: editing ? toArgTime(editing.startsAt) : '10:00',
    endTime: editing?.endsAt ? toArgTime(editing.endsAt) : '',
    location: editing?.location ?? '',
    notes: editing?.notes ?? '',
  }))
  const [projectIds, setProjectIds] = useState<string[]>(editing?.projectIds ?? [])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function toggleProject(id: string) {
    setProjectIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.endTime && form.endTime < form.startTime) {
      setError('La hora de fin no puede ser anterior a la de inicio.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const input = {
        title: form.title,
        startsAt: `${form.date}T${form.startTime}:00${OFFSET}`,
        endsAt: form.endTime ? `${form.date}T${form.endTime}:00${OFFSET}` : null,
        location: form.location,
        notes: form.notes,
        projectIds,
      }
      if (editing) await updateMeeting(editing.id, input)
      else await createMeeting(input)
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar reunión' : 'Nueva reunión'}</DialogTitle><DialogDescription>Podés asociarla a uno o varios proyectos, o dejarla sin proyecto.</DialogDescription></DialogHeader>
        <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="grid gap-2"><Label htmlFor="meeting-title">Título *</Label><Input id="meeting-title" required maxLength={160} placeholder="Ej. Revisión semanal" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2"><Label htmlFor="meeting-date">Fecha *</Label><Input id="meeting-date" required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="meeting-start">Desde *</Label><Input id="meeting-start" required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="meeting-end">Hasta</Label><Input id="meeting-end" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="meeting-location">Lugar / link</Label><Input id="meeting-location" maxLength={240} placeholder="Oficina, Meet, Zoom…" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></div>
          {projects.length > 0 && (
            <div className="grid gap-2">
              <Label>Proyectos</Label>
              <div className="flex flex-wrap gap-1.5">
                {projects.map((project) => {
                  const selected = projectIds.includes(project.id)
                  return (
                    <button type="button" key={project.id} onClick={() => toggleProject(project.id)} className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>{project.name}</button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="grid gap-2"><Label htmlFor="meeting-notes">Notas</Label><Textarea id="meeting-notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {editing && onRequestDelete ? <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onRequestDelete}>Eliminar</Button> : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar reunión'}</Button></div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
