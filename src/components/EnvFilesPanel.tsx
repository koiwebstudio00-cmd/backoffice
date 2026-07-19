import { AlertCircle, Check, Copy, Eye, FileCode2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { deleteEnvFile, listEnvFiles, revealEnvFile, saveEnvFile, type EnvFileRecord } from '@/data/repository'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

const REVALIDATION_WINDOW_MS = 5 * 60 * 1000
const AUTO_HIDE_MS = 60 * 1000

function nowMs(): number {
  return Date.now()
}

interface EnvFilesPanelProps {
  projectId: string
  userEmail: string
}

interface RevealedFile {
  name: string
  content: string
}

export function EnvFilesPanel({ projectId, userEmail }: EnvFilesPanelProps) {
  const [files, setFiles] = useState<EnvFileRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ file: EnvFileRecord | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<EnvFileRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [revealTarget, setRevealTarget] = useState<EnvFileRecord | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<RevealedFile | null>(null)
  const lastVerifiedRef = useRef(0)

  const reload = useCallback(async () => {
    setFiles(await listEnvFiles(projectId))
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    void listEnvFiles(projectId).then((next) => {
      if (cancelled) return
      setFiles(next)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [projectId])

  useEffect(() => {
    if (!revealed) return
    const timer = setTimeout(() => setRevealed(null), AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  const doReveal = useCallback(async (file: EnvFileRecord) => {
    setRevealingId(file.id)
    setError(null)
    try {
      const { content } = await revealEnvFile(file.id)
      setRevealed({ name: file.name, content })
    } catch (revealError) {
      setError(getErrorMessage(revealError))
    } finally {
      setRevealingId(null)
    }
  }, [])

  function requestReveal(file: EnvFileRecord) {
    if (nowMs() - lastVerifiedRef.current < REVALIDATION_WINDOW_MS) {
      void doReveal(file)
    } else {
      setRevealTarget(file)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deleteEnvFile(pendingDelete.id)
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
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><FileCode2 className="size-3.5" /> {files.length} archivo{files.length === 1 ? '' : 's'} cifrado{files.length === 1 ? '' : 's'}</p>
        <Button size="sm" onClick={() => setDialog({ file: null })}><Plus /> Nuevo archivo</Button>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading ? <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => (
            <Card className="border-border/70 shadow-none" key={file.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileCode2 className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate font-mono text-sm font-medium">{file.name}</strong>
                  <small className="block truncate text-xs text-muted-foreground">Actualizado {formatDateTime(file.updatedAt)}</small>
                </div>
                <Button variant="outline" size="sm" disabled={revealingId === file.id} onClick={() => requestReveal(file)}><Eye /> {revealingId === file.id ? 'Revelando…' : 'Revelar'}</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${file.name}`} onClick={() => setDialog({ file })}><Pencil /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${file.name}`} onClick={() => setPendingDelete(file)}><Trash2 /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-border/70 p-6 text-center">
          <div><FileCode2 className="mx-auto mb-2 size-5 text-muted-foreground" /><span className="block text-xs text-muted-foreground">Sin archivos. El contenido se guarda cifrado y se revela con re-validación.</span></div>
        </div>
      )}

      {dialog && (
        <EnvFileFormDialog
          open
          onOpenChange={(open) => { if (!open) setDialog(null) }}
          projectId={projectId}
          editing={dialog.file}
          onSaved={reload}
        />
      )}

      <EnvPasswordGateDialog
        open={Boolean(revealTarget)}
        email={userEmail}
        onCancel={() => setRevealTarget(null)}
        onVerified={() => {
          lastVerifiedRef.current = nowMs()
          const target = revealTarget
          setRevealTarget(null)
          if (target) void doReveal(target)
        }}
      />

      <EnvRevealDialog revealed={revealed} onClose={() => setRevealed(null)} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar este archivo?</AlertDialogTitle><AlertDialogDescription>“{pendingDelete?.name}” se eliminará de forma permanente, junto con su contenido cifrado.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar archivo'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface EnvFileFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  editing: EnvFileRecord | null
  onSaved: () => void | Promise<void>
}

function EnvFileFormDialog({ open, onOpenChange, projectId, editing, onSaved }: EnvFileFormDialogProps) {
  const [form, setForm] = useState(() => ({ name: editing?.name ?? '.env', content: '' }))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing && !form.content.trim()) {
      setError('Pegá el contenido del archivo.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await saveEnvFile({
        id: editing?.id,
        projectId: editing ? undefined : projectId,
        name: form.name,
        content: form.content.trim() ? form.content : undefined,
      })
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>{editing ? 'Editar archivo' : 'Nuevo archivo .env'}</DialogTitle><DialogDescription>El contenido se cifra del lado servidor (AES-256-GCM); la base nunca ve el texto plano.</DialogDescription></DialogHeader>
        <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="grid gap-2"><Label htmlFor="env-name">Nombre *</Label><Input id="env-name" required maxLength={120} className="font-mono" placeholder=".env, .env.production…" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="env-content">Contenido {editing ? '(dejá vacío para no cambiarlo)' : '*'}</Label><Textarea id="env-content" rows={10} className="font-mono text-xs" spellCheck={false} placeholder={'DATABASE_URL=…\nAPI_KEY=…'} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} /></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar archivo'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface EnvPasswordGateDialogProps {
  open: boolean
  email: string
  onCancel: () => void
  onVerified: () => void
}

function EnvPasswordGateDialog({ open, email, onCancel, onVerified }: EnvPasswordGateDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setIsChecking(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError('Contraseña incorrecta.')
        return
      }
      setPassword('')
      onVerified()
    } catch {
      setError('No se pudo validar. Probá de nuevo.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) { setPassword(''); setError(null); onCancel() } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Confirmá tu identidad</DialogTitle><DialogDescription>Reingresá tu contraseña para revelar el archivo. Queda válida unos minutos.</DialogDescription></DialogHeader>
        <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <Input type="password" autoFocus autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => { setPassword(''); setError(null); onCancel() }}>Cancelar</Button><Button type="submit" disabled={isChecking || !password}>{isChecking ? 'Verificando…' : 'Confirmar'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EnvRevealDialog({ revealed, onClose }: { revealed: RevealedFile | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!revealed) return
    try {
      await navigator.clipboard.writeText(revealed.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable; ignore
    }
  }

  return (
    <Dialog open={Boolean(revealed)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-mono">{revealed?.name}</DialogTitle><DialogDescription>Se oculta solo en un minuto. No se guarda en el navegador.</DialogDescription></DialogHeader>
        {revealed && (
          <div className="space-y-3 pt-2">
            <pre className="max-h-80 overflow-auto rounded-lg border border-border/70 bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">{revealed.content}</pre>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { void copy() }}>{copied ? <Check className="text-emerald-600" /> : <Copy />} {copied ? 'Copiado' : 'Copiar todo'}</Button>
              <Button variant="outline" className="flex-1" onClick={onClose}>Cerrar y ocultar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
