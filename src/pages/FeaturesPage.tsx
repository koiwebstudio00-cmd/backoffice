import { AlertCircle, Lightbulb, MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
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
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/auth/auth-context'
import {
  createFeatureRequest,
  createFeatureRequestComment,
  deleteFeatureRequest,
  deleteFeatureRequestComment,
  listFeatureRequestComments,
  listFeatureRequests,
  updateFeatureRequest,
  updateFeatureRequestStatus,
  type FeatureRequestCommentRecord,
  type FeatureRequestRecord,
  type FeatureRequestStatus,
} from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

type StatusFilter = 'all' | FeatureRequestStatus

const statusLabels: Record<FeatureRequestStatus, string> = {
  proposed: 'Propuesta',
  accepted: 'Aceptada',
  in_progress: 'En desarrollo',
  done: 'Hecha',
  rejected: 'Rechazada',
}

const statusClasses: Record<FeatureRequestStatus, string> = {
  proposed: 'bg-muted text-muted-foreground',
  accepted: 'bg-primary/10 text-primary',
  in_progress: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  done: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-destructive/10 text-destructive',
}

const statusOrder: FeatureRequestStatus[] = ['proposed', 'accepted', 'in_progress', 'done', 'rejected']

const initialForm = { title: '', description: '' }

export function FeaturesPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [requests, setRequests] = useState<FeatureRequestRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<FeatureRequestRecord | null>(null)
  const [requestPendingDelete, setRequestPendingDelete] = useState<FeatureRequestRecord | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [commentsRequest, setCommentsRequest] = useState<FeatureRequestRecord | null>(null)
  const [comments, setComments] = useState<FeatureRequestCommentRecord[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)
  const [isSendingComment, setIsSendingComment] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const nextRequests = await listFeatureRequests()
      setError(null)
      setRequests(nextRequests)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void listFeatureRequests().then((nextRequests) => {
      if (cancelled) return
      setRequests(nextRequests)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filteredRequests = useMemo(
    () => requests.filter((request) => statusFilter === 'all' || request.status === statusFilter),
    [requests, statusFilter],
  )

  function openCreateForm() {
    setEditingRequest(null)
    setForm(initialForm)
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditForm(request: FeatureRequestRecord) {
    setEditingRequest(request)
    setForm({ title: request.title, description: request.description ?? '' })
    setFormError(null)
    setIsFormOpen(true)
  }

  function handleFormOpenChange(open: boolean) {
    setIsFormOpen(open)
    if (!open) {
      setEditingRequest(null)
      setForm(initialForm)
      setFormError(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setFormError(null)
    try {
      if (editingRequest) await updateFeatureRequest(editingRequest.id, form)
      else await createFeatureRequest(form)
      handleFormOpenChange(false)
      await loadData()
    } catch (saveError) {
      setFormError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStatusChange(request: FeatureRequestRecord, status: FeatureRequestStatus) {
    if (status === request.status) return
    setError(null)
    try {
      await updateFeatureRequestStatus(request.id, status)
      await loadData()
    } catch (statusError) {
      setError(getErrorMessage(statusError))
    }
  }

  async function handleDelete() {
    if (!requestPendingDelete) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteFeatureRequest(requestPendingDelete.id)
      setRequestPendingDelete(null)
      await loadData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setRequestPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const loadComments = useCallback(async (requestId: string) => {
    setIsLoadingComments(true)
    setCommentError(null)
    try {
      setComments(await listFeatureRequestComments(requestId))
    } catch (loadError) {
      setCommentError(getErrorMessage(loadError))
    } finally {
      setIsLoadingComments(false)
    }
  }, [])

  function openComments(request: FeatureRequestRecord) {
    setCommentsRequest(request)
    setComments([])
    setCommentBody('')
    void loadComments(request.id)
  }

  function handleCommentsOpenChange(open: boolean) {
    if (!open) {
      setCommentsRequest(null)
      setComments([])
      setCommentBody('')
      setCommentError(null)
      void loadData()
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!commentsRequest || !commentBody.trim()) return
    setIsSendingComment(true)
    setCommentError(null)
    try {
      await createFeatureRequestComment(commentsRequest.id, commentBody)
      setCommentBody('')
      await loadComments(commentsRequest.id)
    } catch (sendError) {
      setCommentError(getErrorMessage(sendError))
    } finally {
      setIsSendingComment(false)
    }
  }

  async function handleCommentDelete(commentId: string) {
    if (!commentsRequest) return
    setCommentError(null)
    try {
      await deleteFeatureRequestComment(commentId)
      await loadComments(commentsRequest.id)
    } catch (deleteError) {
      setCommentError(getErrorMessage(deleteError))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Equipo" title="Features" description="Propuestas de mejoras para el propio sistema: qué se pidió, qué se aceptó y qué ya está hecho." action={<Button onClick={openCreateForm}><Plus className="size-4" /> Nueva propuesta</Button>} />

      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRequest ? 'Editar propuesta' : 'Proponer una feature'}</DialogTitle>
            <DialogDescription>{editingRequest ? 'Actualizá el título o la descripción.' : 'Contá qué te gustaría que el sistema haga y por qué.'}</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
            {formError && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
            <div className="grid gap-2"><Label htmlFor="feature-title">Título *</Label><Input id="feature-title" required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="feature-description">Descripción</Label><Textarea id="feature-description" rows={4} maxLength={4000} placeholder="Qué problema resuelve, cómo debería funcionar…" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => handleFormOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editingRequest ? 'Guardar cambios' : 'Enviar propuesta'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(commentsRequest)} onOpenChange={handleCommentsOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{commentsRequest?.title}</DialogTitle>
            <DialogDescription>Comentarios de la propuesta.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {commentError && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{commentError}</AlertDescription></Alert>}
            {isLoadingComments && <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}
            {!isLoadingComments && comments.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>}
            {!isLoadingComments && comments.length > 0 && (
              <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <li className="rounded-lg border border-border/70 p-3" key={comment.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{comment.authorName ?? 'Equipo'}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {formatDateTime(comment.createdAt)}
                        {(isOwner || comment.createdBy === user?.id) && (
                          <Button variant="ghost" size="icon-sm" aria-label="Eliminar comentario" onClick={() => { void handleCommentDelete(comment.id) }}><Trash2 className="size-3.5" /></Button>
                        )}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm whitespace-pre-wrap">{comment.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <form className="grid gap-2" onSubmit={handleCommentSubmit}>
              <Label htmlFor="feature-comment">Nuevo comentario</Label>
              <Textarea id="feature-comment" rows={2} maxLength={4000} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />
              <div className="flex justify-end"><Button type="submit" size="sm" disabled={isSendingComment || !commentBody.trim()}>{isSendingComment ? 'Enviando…' : 'Comentar'}</Button></div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(requestPendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setRequestPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta propuesta?</AlertDialogTitle><AlertDialogDescription>Se eliminará "{requestPendingDelete?.title}" junto con sus comentarios. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar propuesta'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Resumen de propuestas">
        {statusOrder.map((status) => (
          <Card className="border-border/70 py-0 shadow-none" key={status}>
            <CardContent className="p-4">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{statusLabels[status]}</span>
              <strong className="mt-2 block font-mono text-xl font-semibold">{requests.filter((request) => request.status === status).length}</strong>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden border-border/70 py-0 shadow-none" aria-busy={isLoading}>
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">{filteredRequests.length} {filteredRequests.length === 1 ? 'propuesta' : 'propuestas'}</span>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {statusOrder.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <div className="space-y-3 p-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}

        {!isLoading && filteredRequests.length > 0 && (
          <ul className="divide-y divide-border/70">
            {filteredRequests.map((request) => (
              <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between" key={request.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm font-medium">{request.title}</strong>
                    <Badge className={statusClasses[request.status]} variant="secondary">{statusLabels[request.status]}</Badge>
                  </div>
                  {request.description && <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-muted-foreground">{request.description}</p>}
                  <small className="mt-1.5 block text-xs text-muted-foreground">{request.authorName ?? 'Equipo'} · {formatDateTime(request.createdAt)}</small>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => openComments(request)}><MessageSquare className="size-3.5" /> {request.commentCount}</Button>
                  {isOwner && (
                    <Select value={request.status} onValueChange={(value) => { void handleStatusChange(request, value as FeatureRequestStatus) }}>
                      <SelectTrigger className="h-8 w-36" aria-label={`Estado de ${request.title}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOrder.map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {(isOwner || request.createdBy === user?.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${request.title}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEditForm(request)}><Pencil /> Editar</DropdownMenuItem>
                        {isOwner && <DropdownMenuItem variant="destructive" onSelect={() => setRequestPendingDelete(request)}><Trash2 /> Eliminar</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && filteredRequests.length === 0 && (
          <div className="grid min-h-56 place-items-center p-6 text-center">
            <div>
              <Lightbulb className="mx-auto mb-3 size-5 text-muted-foreground" />
              <strong className="block text-sm">{requests.length === 0 ? 'Todavía no hay propuestas' : 'No hay propuestas con ese estado'}</strong>
              <span className="mt-1 block text-xs text-muted-foreground">{requests.length === 0 ? 'Proponé la primera mejora para el sistema.' : 'Probá con otro estado.'}</span>
              {requests.length === 0 && <Button className="mt-4" size="sm" onClick={openCreateForm}><Plus className="size-4" /> Nueva propuesta</Button>}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
