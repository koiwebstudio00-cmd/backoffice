import { AlertCircle, Check, Copy, Globe, RefreshCw, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { disablePortal, enablePortal, getPortalToken, type PortalTokenRecord } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'

interface PortalAccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
}

function portalUrl(token: string): string {
  return `${window.location.origin}/portal/${token}`
}

export function PortalAccessDialog({ open, onOpenChange, clientId, clientName }: PortalAccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Globe className="size-4 text-primary" /> Portal de {clientName}</DialogTitle>
          <DialogDescription>Link privado de solo lectura: proyectos con avance, pagos (sin importes) y notas del cliente.</DialogDescription>
        </DialogHeader>
        {open && <PortalAccessBody clientId={clientId} />}
      </DialogContent>
    </Dialog>
  )
}

function PortalAccessBody({ clientId }: { clientId: string }) {
  const [token, setToken] = useState<PortalTokenRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [freshLink, setFreshLink] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'regenerate' | 'disable' | null>(null)

  useEffect(() => {
    let cancelled = false
    void getPortalToken(clientId).then((next) => {
      if (cancelled) return
      setToken(next)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [clientId])

  async function generate() {
    setIsWorking(true)
    setError(null)
    try {
      const plainToken = await enablePortal(clientId)
      setFreshLink(portalUrl(plainToken))
      setToken(await getPortalToken(clientId))
    } catch (generateError) {
      setError(getErrorMessage(generateError))
    } finally {
      setIsWorking(false)
    }
  }

  async function disable() {
    setIsWorking(true)
    setError(null)
    try {
      await disablePortal(clientId)
      setToken(null)
      setFreshLink(null)
    } catch (disableError) {
      setError(getErrorMessage(disableError))
    } finally {
      setIsWorking(false)
    }
  }

  async function copyLink() {
    if (!freshLink) return
    try {
      await navigator.clipboard.writeText(freshLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable; ignore
    }
  }

  const isActive = Boolean(token)

  return (
    <div className="min-w-0 space-y-4 overflow-hidden pt-2">
      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading ? <Skeleton className="h-20 w-full" /> : (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Estado</span>
              <Badge variant="secondary" className={isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}>{isActive ? 'Activo' : 'Desactivado'}</Badge>
            </div>
            {token && (
              <small className="mt-1 block text-xs text-muted-foreground">
                Generado {formatDateTime(token.createdAt)} · Último acceso: {token.lastAccessedAt ? formatDateTime(token.lastAccessedAt) : 'nunca'}
              </small>
            )}
          </div>
        </div>
      )}

      {freshLink && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary"><TriangleAlert className="size-3.5" /> Copiá el link ahora: no se vuelve a mostrar.</span>
          <code className="block w-full rounded bg-muted/60 px-2 py-1.5 font-mono text-xs break-all">{freshLink}</code>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { void copyLink() }}>{copied ? <Check className="text-emerald-600" /> : <Copy />} {copied ? 'Copiado' : 'Copiar'}</Button>
          </div>
        </div>
      )}

      {!isLoading && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {isActive ? (
            <>
              <Button variant="outline" disabled={isWorking} onClick={() => setConfirmAction('disable')}>Desactivar portal</Button>
              <Button disabled={isWorking} onClick={() => setConfirmAction('regenerate')}><RefreshCw className={isWorking ? 'animate-spin' : ''} /> Regenerar link</Button>
            </>
          ) : (
            <Button disabled={isWorking} onClick={() => { void generate() }}><Globe /> {isWorking ? 'Activando…' : 'Activar portal'}</Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">Cualquiera con el link puede ver el portal. Las notas del cliente se muestran completas; los importes nunca se exponen.</p>

      <AlertDialog open={Boolean(confirmAction)} onOpenChange={(value) => { if (!value && !isWorking) setConfirmAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === 'disable' ? '¿Desactivar el portal?' : '¿Regenerar el link?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'disable'
                ? 'El link actual dejará de funcionar de inmediato. Podés volver a activarlo cuando quieras con un link nuevo.'
                : 'El link actual dejará de funcionar y se generará uno nuevo que vas a tener que compartirle al cliente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWorking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isWorking} onClick={(event) => {
              event.preventDefault()
              const action = confirmAction
              setConfirmAction(null)
              if (action === 'disable') void disable()
              else void generate()
            }}>{confirmAction === 'disable' ? 'Desactivar' : 'Regenerar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
