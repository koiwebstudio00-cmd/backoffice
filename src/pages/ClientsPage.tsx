import { AlertCircle, Building2, Mail, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { createClient, listClients, type ClientRecord, type ClientStatus } from '@/data/repository'
import { formatDateTime } from '@/lib/format'

type StatusFilter = 'all' | ClientStatus

const initialForm = {
  name: '', company: '', email: '', phone: '', notes: '', status: 'lead' as ClientStatus,
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No pudimos completar la operación.'
}

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState(initialForm)

  const loadData = useCallback(async () => {
    try {
      const nextClients = await listClients()
      setError(null)
      setClients(nextClients)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void listClients().then((nextClients) => {
      if (cancelled) return
      setClients(nextClients)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return clients.filter((client) => {
      const matchesQuery = !normalizedQuery || client.name.toLowerCase().includes(normalizedQuery) || client.company?.toLowerCase().includes(normalizedQuery) || client.email?.toLowerCase().includes(normalizedQuery)
      return matchesQuery && (status === 'all' || client.status === status)
    })
  }, [clients, query, status])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await createClient(form)
      setForm(initialForm)
      setIsFormOpen(false)
      await loadData()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="CRM" title="Clientes" description="Relaciones, contactos y proyectos en un solo lugar." action={<Button onClick={() => setIsFormOpen(true)}><Plus className="size-4" /> Nuevo cliente</Button>} />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Agregar cliente</DialogTitle><DialogDescription>Creá la ficha base; después vas a poder asociarle proyectos.</DialogDescription></DialogHeader>
          <form className="grid gap-4 pt-2 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid gap-2"><Label htmlFor="client-name">Nombre *</Label><Input id="client-name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="client-company">Empresa</Label><Input id="client-company" maxLength={120} value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="client-email">Email</Label><Input id="client-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div className="grid gap-2"><Label htmlFor="client-phone">Teléfono</Label><Input id="client-phone" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div className="grid gap-2"><Label>Estado</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as ClientStatus })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="lead">Prospecto</SelectItem><SelectItem value="active">Activo</SelectItem><SelectItem value="paused">Pausado</SelectItem><SelectItem value="closed">Cerrado</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2 sm:col-span-2"><Label htmlFor="client-notes">Notas</Label><Textarea id="client-notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
            <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar cliente'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo completar la operación</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de clientes">
        {[
          ['Total', clients.length],
          ['Activos', clients.filter((client) => client.status === 'active').length],
          ['Prospectos', clients.filter((client) => client.status === 'lead').length],
          ['En pausa', clients.filter((client) => client.status === 'paused').length],
        ].map(([label, value]) => <Card className="border-border/70 py-0 shadow-none" key={label}><CardContent className="p-4"><span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{label}</span><strong className="mt-2 block font-mono text-xl font-semibold">{value}</strong></CardContent></Card>)}
      </section>

      <Card className="overflow-hidden border-border/70 py-0 shadow-none" aria-busy={isLoading}>
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-md"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="search" placeholder="Buscar por nombre, empresa o email…" aria-label="Buscar clientes" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}><SelectTrigger className="w-full sm:ml-auto sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="lead">Prospectos</SelectItem><SelectItem value="paused">Pausados</SelectItem><SelectItem value="closed">Cerrados</SelectItem></SelectContent></Select>
        </div>

        {isLoading && <div className="space-y-3 p-5"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>}
        {!isLoading && filteredClients.length > 0 && <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Contacto</TableHead><TableHead>Estado</TableHead><TableHead>Proyectos</TableHead><TableHead>Última actividad</TableHead></TableRow></TableHeader><TableBody>{filteredClients.map((client) => { const identity = client.company || client.name; return <TableRow key={client.id}><TableCell><div className="flex min-w-44 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">{identity.slice(0, 2).toUpperCase()}</span><div><strong className="text-sm font-medium">{client.name}</strong><small className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="size-3" /> {client.company || 'Sin empresa'}</small></div></div></TableCell><TableCell>{client.email ? <a className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary" href={`mailto:${client.email}`}><Mail className="size-3.5" /> {client.email}</a> : <span className="text-xs text-muted-foreground">Sin email</span>}</TableCell><TableCell><StatusBadge status={client.status} /></TableCell><TableCell className="font-mono text-xs">{client.projectsCount}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDateTime(client.updatedAt)}</TableCell></TableRow> })}</TableBody></Table>}

        {!isLoading && filteredClients.length === 0 && <div className="grid min-h-56 place-items-center p-6 text-center"><div><Search className="mx-auto mb-3 size-5 text-muted-foreground" /><strong className="block text-sm">{clients.length === 0 ? 'Todavía no hay clientes' : 'No encontramos clientes'}</strong><span className="mt-1 block text-xs text-muted-foreground">{clients.length === 0 ? 'Creá el primero para empezar a trabajar con datos reales.' : 'Probá con otro término o estado.'}</span>{clients.length === 0 && <Button className="mt-4" size="sm" onClick={() => setIsFormOpen(true)}><Plus className="size-4" /> Nuevo cliente</Button>}</div></div>}
      </Card>
    </div>
  )
}
