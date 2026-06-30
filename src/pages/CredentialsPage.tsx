import { ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/auth-context'
import { CredentialsPanel, type CredentialClientOption, type CredentialProjectOption } from '@/components/CredentialsPanel'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { listFinancialReferences } from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'

export function CredentialsPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [clients, setClients] = useState<CredentialClientOption[]>([])
  const [projects, setProjects] = useState<CredentialProjectOption[]>([])
  const [isLoading, setIsLoading] = useState(isOwner)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOwner) return
    let cancelled = false
    void listFinancialReferences().then((references) => {
      if (cancelled) return
      setClients(references.clients)
      setProjects(references.projects)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [isOwner])

  if (!isOwner) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Seguridad" title="Credenciales" description="Contraseñas cifradas y accesibles solo cuando hacen falta." />
        <Alert><ShieldAlert className="size-4" /><AlertTitle>Acceso restringido</AlertTitle><AlertDescription>La bóveda de credenciales está disponible únicamente para usuarios con rol owner.</AlertDescription></Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Seguridad" title="Credenciales" description="Todas las credenciales de la agencia, cifradas del lado servidor y reveladas con re-validación." />

      {error && <Alert variant="destructive"><AlertTitle>No se pudo cargar</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading
        ? <div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
        : <CredentialsPanel userEmail={user?.email ?? ''} clients={clients} projects={projects} />}
    </div>
  )
}
