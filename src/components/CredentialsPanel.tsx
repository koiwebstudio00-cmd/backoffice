import { AlertCircle, Check, Copy, Eye, KeyRound, Lock, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { deleteCredential, listAllCredentials, listCredentials, revealCredential, saveCredential, type CredentialRecord } from '@/data/repository'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

const REVALIDATION_WINDOW_MS = 5 * 60 * 1000
const AUTO_HIDE_MS = 30 * 1000

function nowMs(): number {
  return Date.now()
}

export interface CredentialClientOption {
  id: string
  name: string
}

export interface CredentialProjectOption {
  id: string
  clientId: string | null
  name: string
}

interface CredentialsPanelProps {
  clientId?: string
  projectId?: string
  userEmail: string
  clients?: CredentialClientOption[]
  projects?: CredentialProjectOption[]
  onChanged?: () => void
}

interface RevealedSecret {
  serviceName: string
  username: string | null
  secret: string
  notes: string | null
}

export function CredentialsPanel({ clientId, projectId, userEmail, clients, projects, onChanged }: CredentialsPanelProps) {
  const global = !clientId && !projectId
  const [credentials, setCredentials] = useState<CredentialRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<{ credential: CredentialRecord | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<CredentialRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [revealTarget, setRevealTarget] = useState<CredentialRecord | null>(null)
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null)
  const lastVerifiedRef = useRef(0)

  const reload = useCallback(async () => {
    setCredentials(global ? await listAllCredentials() : await listCredentials(clientId, projectId))
    onChanged?.()
  }, [global, clientId, projectId, onChanged])

  useEffect(() => {
    let cancelled = false
    const request = (!clientId && !projectId) ? listAllCredentials() : listCredentials(clientId, projectId)
    void request.then((next) => {
      if (cancelled) return
      setCredentials(next)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [clientId, projectId])

  useEffect(() => {
    if (!revealed) return
    const timer = setTimeout(() => setRevealed(null), AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return credentials
    return credentials.filter((credential) => [credential.serviceName, credential.clientName, credential.projectName, credential.username]
      .some((value) => value?.toLowerCase().includes(normalized)))
  }, [credentials, query])

  const doReveal = useCallback(async (credential: CredentialRecord) => {
    setRevealingId(credential.id)
    setError(null)
    try {
      const { secret, notes } = await revealCredential(credential.id)
      setRevealed({ serviceName: credential.serviceName, username: credential.username, secret, notes })
    } catch (revealError) {
      setError(getErrorMessage(revealError))
    } finally {
      setRevealingId(null)
    }
  }, [])

  function requestReveal(credential: CredentialRecord) {
    if (nowMs() - lastVerifiedRef.current < REVALIDATION_WINDOW_MS) {
      void doReveal(credential)
    } else {
      setRevealTarget(credential)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deleteCredential(pendingDelete.id)
      setPendingDelete(null)
      await reload()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  function subtitle(credential: CredentialRecord): string {
    const parts: string[] = []
    if (global && credential.clientName) parts.push(credential.clientName)
    if (credential.projectName && !projectId) parts.push(credential.projectName)
    if (credential.username) parts.push(credential.username)
    else if (!global) parts.push('Sin usuario')
    if (!global && credential.serviceUrl) parts.push(credential.serviceUrl)
    return parts.join(' · ')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="size-3.5" /> {credentials.length} credencial{credentials.length === 1 ? '' : 'es'} cifrada{credentials.length === 1 ? '' : 's'}</p>
        <div className="flex items-center gap-2">
          {global && <div className="relative flex-1 sm:w-64"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="search" aria-label="Buscar credencial" placeholder="Buscar servicio, cliente, proyecto…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>}
          <Button size="sm" className="shrink-0" onClick={() => setDialog({ credential: null })}><Plus /> Nueva credencial</Button>
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading ? <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((credential) => (
            <Card className="border-border/70 shadow-none" key={credential.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-medium">{credential.serviceName}</strong>
                  <small className="block truncate text-xs text-muted-foreground">{subtitle(credential)}</small>
                </div>
                <Button variant="outline" size="sm" disabled={revealingId === credential.id} onClick={() => requestReveal(credential)}><Eye /> {revealingId === credential.id ? 'Revelando…' : 'Revelar'}</Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Editar ${credential.serviceName}`} onClick={() => setDialog({ credential })}><Pencil /></Button>
                <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${credential.serviceName}`} onClick={() => setPendingDelete(credential)}><Trash2 /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-border/70 p-6 text-center">
          <div><KeyRound className="mx-auto mb-2 size-5 text-muted-foreground" /><span className="block text-xs text-muted-foreground">{credentials.length === 0 ? 'Sin credenciales. Las contraseñas se guardan cifradas y se revelan con re-validación.' : 'No hay resultados para esa búsqueda.'}</span></div>
        </div>
      )}

      {dialog && (
        <CredentialFormDialog
          open
          onOpenChange={(open) => { if (!open) setDialog(null) }}
          lockedClientId={clientId}
          lockedProjectId={projectId}
          clients={clients}
          projects={projects}
          editing={dialog.credential}
          onSaved={reload}
        />
      )}

      <PasswordGateDialog
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

      <RevealDialog revealed={revealed} onClose={() => setRevealed(null)} />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta credencial?</AlertDialogTitle><AlertDialogDescription>“{pendingDelete?.serviceName}” se eliminará de forma permanente, junto con su registro cifrado.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar credencial'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface CredentialFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lockedClientId?: string
  lockedProjectId?: string
  clients?: CredentialClientOption[]
  projects?: CredentialProjectOption[]
  editing: CredentialRecord | null
  onSaved: () => void | Promise<void>
}

function CredentialFormDialog({ open, onOpenChange, lockedClientId, lockedProjectId, clients, projects, editing, onSaved }: CredentialFormDialogProps) {
  const [form, setForm] = useState(() => ({
    serviceName: editing?.serviceName ?? '',
    serviceUrl: editing?.serviceUrl ?? '',
    username: editing?.username ?? '',
    secret: '',
    notes: '',
    clientId: editing?.clientId ?? lockedClientId ?? clients?.[0]?.id ?? '',
    projectId: editing?.projectId ?? lockedProjectId ?? '',
  }))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showClientPicker = !editing && !lockedClientId && Boolean(clients && clients.length > 0)
  const showProjectPicker = !editing && !lockedProjectId && Boolean(projects && projects.length > 0)
  const visibleProjects = (projects ?? []).filter((project) => project.clientId === form.clientId)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.clientId && !form.projectId) {
      setError('Asociá la credencial a un cliente o a un proyecto.')
      return
    }
    if (!editing && !form.secret) {
      setError('Ingresá la contraseña a guardar.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await saveCredential({
        id: editing?.id,
        clientId: form.clientId || undefined,
        projectId: form.projectId || undefined,
        serviceName: form.serviceName,
        serviceUrl: form.serviceUrl || undefined,
        username: form.username || undefined,
        secret: form.secret || undefined,
        notes: form.notes || undefined,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{editing ? 'Editar credencial' : 'Nueva credencial'}</DialogTitle><DialogDescription>La contraseña se cifra del lado servidor (AES-256-GCM); la base nunca ve el texto plano.</DialogDescription></DialogHeader>
        <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          {(showClientPicker || showProjectPicker) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {showClientPicker && (
                <div className="grid gap-2"><Label>Cliente *</Label><Select required value={form.clientId} onValueChange={(value) => setForm({ ...form, clientId: value, projectId: '' })}><SelectTrigger className="w-full"><SelectValue placeholder="Elegí un cliente" /></SelectTrigger><SelectContent>{clients!.map((client) => <SelectItem value={client.id} key={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
              )}
              {showProjectPicker && (
                <div className="grid gap-2"><Label>Proyecto (opcional)</Label><Select value={form.projectId || 'none'} onValueChange={(value) => setForm({ ...form, projectId: value === 'none' ? '' : value })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin proyecto</SelectItem>{visibleProjects.map((project) => <SelectItem value={project.id} key={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
              )}
            </div>
          )}
          <div className="grid gap-2"><Label htmlFor="cred-service">Servicio *</Label><Input id="cred-service" required maxLength={160} placeholder="Ej. AWS, cPanel, Gmail…" value={form.serviceName} onChange={(event) => setForm({ ...form, serviceName: event.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label htmlFor="cred-url">URL</Label><Input id="cred-url" maxLength={240} placeholder="https://…" value={form.serviceUrl} onChange={(event) => setForm({ ...form, serviceUrl: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="cred-user">Usuario</Label><Input id="cred-user" autoComplete="off" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="cred-secret">Contraseña {editing ? '' : '*'}</Label><Input id="cred-secret" type="password" autoComplete="new-password" placeholder={editing ? 'Dejá vacío para no cambiarla' : ''} value={form.secret} onChange={(event) => setForm({ ...form, secret: event.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="cred-notes">Notas {editing ? '(se sobrescriben)' : ''}</Label><Textarea id="cred-notes" rows={2} placeholder="Notas sensibles (también se cifran)" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar credencial'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface PasswordGateDialogProps {
  open: boolean
  email: string
  onCancel: () => void
  onVerified: () => void
}

function PasswordGateDialog({ open, email, onCancel, onVerified }: PasswordGateDialogProps) {
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
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Confirmá tu identidad</DialogTitle><DialogDescription>Reingresá tu contraseña para revelar credenciales. Queda válida unos minutos.</DialogDescription></DialogHeader>
        <form className="grid gap-4 pt-2" onSubmit={handleSubmit}>
          {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <Input type="password" autoFocus autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => { setPassword(''); setError(null); onCancel() }}>Cancelar</Button><Button type="submit" disabled={isChecking || !password}>{isChecking ? 'Verificando…' : 'Confirmar'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RevealDialog({ revealed, onClose }: { revealed: RevealedSecret | null; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      setTimeout(() => setCopied((current) => (current === label ? null : current)), 1500)
    } catch {
      // clipboard unavailable; ignore
    }
  }

  return (
    <Dialog open={Boolean(revealed)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{revealed?.serviceName}</DialogTitle><DialogDescription>Se oculta solo en unos segundos. No se guarda en el navegador.</DialogDescription></DialogHeader>
        {revealed && (
          <div className="space-y-3 pt-2">
            {revealed.username && <RevealField label="Usuario" value={revealed.username} copied={copied === 'Usuario'} onCopy={() => copy('Usuario', revealed.username!)} />}
            <RevealField label="Contraseña" value={revealed.secret} mono copied={copied === 'Contraseña'} onCopy={() => copy('Contraseña', revealed.secret)} />
            {revealed.notes && <div className="rounded-lg border border-border/70 bg-muted/40 p-3"><span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Notas</span><p className="mt-1 text-sm whitespace-pre-wrap">{revealed.notes}</p></div>}
            <Button variant="outline" className="w-full" onClick={onClose}>Cerrar y ocultar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RevealField({ label, value, mono, copied, onCopy }: { label: string; value: string; mono?: boolean; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 p-3">
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
        <p className={cn('mt-0.5 truncate text-sm', mono && 'font-mono')}>{value}</p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={`Copiar ${label}`} onClick={onCopy}>{copied ? <Check className="text-emerald-600" /> : <Copy />}</Button>
    </div>
  )
}
