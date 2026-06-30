import { AlertCircle, Pencil, Plus, StickyNote, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { createNote, deleteNote, listNotes, updateNote, type NoteRecord } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

export interface NotesPanelProjectOption {
  id: string
  name: string
}

interface NotesPanelProps {
  clientId?: string
  projectId?: string
  currentUserId?: string
  isOwner: boolean
  projects?: NotesPanelProjectOption[]
  onChanged?: () => void
}

export function NotesPanel({ clientId, projectId, currentUserId, isOwner, projects, onChanged }: NotesPanelProps) {
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ note: NoteRecord | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<NoteRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const projectName = useMemo(() => new Map((projects ?? []).map((project) => [project.id, project.name])), [projects])

  const reload = useCallback(async () => {
    const next = await listNotes(clientId, projectId)
    setNotes(next)
    onChanged?.()
  }, [clientId, projectId, onChanged])

  useEffect(() => {
    let cancelled = false
    void listNotes(clientId, projectId).then((next) => {
      if (cancelled) return
      setNotes(next)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [clientId, projectId])

  async function handleDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deleteNote(pendingDelete.id)
      setPendingDelete(null)
      await reload()
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
        <p className="text-sm text-muted-foreground">{notes.length} nota{notes.length === 1 ? '' : 's'}</p>
        <Button size="sm" onClick={() => setDialog({ note: null })}><Plus /> Nueva nota</Button>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading ? <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => {
            const canManage = isOwner || note.createdBy === currentUserId
            return (
              <Card className="border-border/70 shadow-none" key={note.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1 text-sm leading-6 whitespace-pre-wrap">{note.body}</p>
                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Editar nota" onClick={() => setDialog({ note })}><Pencil /></Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Eliminar nota" onClick={() => setPendingDelete(note)}><Trash2 /></Button>
                      </div>
                    )}
                  </div>
                  <small className="mt-2 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                    <span>{note.authorName ?? 'Equipo'}</span>·<span>{formatDateTime(note.createdAt)}</span>
                    {!projectId && note.projectId && projectName.get(note.projectId) && <><span>·</span><Badge variant="outline" className="text-[10px]">{projectName.get(note.projectId)}</Badge></>}
                  </small>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-border/70 p-6 text-center">
          <div><StickyNote className="mx-auto mb-2 size-5 text-muted-foreground" /><span className="block text-xs text-muted-foreground">Todavía no hay notas. Creá la primera para dejar registro.</span></div>
        </div>
      )}

      {dialog && (
        <NoteFormDialog
          open
          onOpenChange={(open) => { if (!open) setDialog(null) }}
          clientId={clientId}
          projectId={projectId}
          projects={projectId ? undefined : projects}
          editing={dialog.note}
          onSaved={reload}
        />
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta nota?</AlertDialogTitle><AlertDialogDescription>La nota se eliminará de forma permanente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar nota'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface NoteFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId?: string
  projectId?: string
  projects?: NotesPanelProjectOption[]
  editing: NoteRecord | null
  onSaved: () => void | Promise<void>
}

function NoteFormDialog({ open, onOpenChange, clientId, projectId, projects, editing, onSaved }: NoteFormDialogProps) {
  const [body, setBody] = useState(editing?.body ?? '')
  const [linkedProjectId, setLinkedProjectId] = useState(editing?.projectId ?? projectId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim()) {
      setError('Escribí algo antes de guardar la nota.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      if (editing) await updateNote(editing.id, body)
      else await createNote({ clientId, projectId: linkedProjectId || undefined, body })
      onOpenChange(false)
      await onSaved()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const showProjectPicker = !editing && !projectId && Boolean(projects && projects.length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar nota' : 'Nueva nota'}</DialogTitle><DialogDescription>Quedan registradas con tu nombre y la fecha.</DialogDescription></DialogHeader>
        <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <Textarea autoFocus rows={5} maxLength={4000} placeholder="Escribí la nota…" value={body} onChange={(event) => setBody(event.target.value)} />
          {showProjectPicker && (
            <div className="grid gap-2">
              <span className="text-sm font-medium">Proyecto (opcional)</span>
              <Select value={linkedProjectId || 'none'} onValueChange={(value) => setLinkedProjectId(value === 'none' ? '' : value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Sin proyecto</SelectItem>{projects!.map((project) => <SelectItem value={project.id} key={project.id}>{project.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar nota'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
