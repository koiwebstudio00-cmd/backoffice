import { AlertCircle, CalendarDays, CheckCircle2, Circle, FolderKanban, StickyNote, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { formatDateTime, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface PortalProject {
  id: string
  name: string
  type: string
  status: string
  startDate: string | null
  deadline: string | null
  progress: number
  milestones: { title: string; dueDate: string; done: boolean }[]
}

interface PortalPayment {
  status: 'pending' | 'settled'
  currency: string
  paymentMethod: string | null
  occurredOn: string
  dueDate: string | null
  settledOn: string | null
}

interface PortalNote {
  body: string
  createdAt: string
  projectName: string | null
}

interface PortalData {
  client: { name: string }
  projects: PortalProject[]
  payments: PortalPayment[]
  notes: PortalNote[]
}

const projectStatusLabels: Record<string, string> = {
  active: 'Activo',
  paused: 'Pausado',
  done: 'Terminado',
}

const paymentMethodLabels: Record<string, string> = {
  transfer: 'Transferencia',
  crypto: 'Crypto',
  cash: 'Efectivo',
  card: 'Tarjeta',
  other: 'Otro',
}

export function PortalPage() {
  const { token = '' } = useParams()
  const [data, setData] = useState<PortalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabase) {
        setError('El portal no está disponible.')
        setIsLoading(false)
        return
      }
      const { data: payload, error: invokeError } = await supabase.functions.invoke<PortalData>('get-client-portal', { body: { token } })
      if (cancelled) return
      if (invokeError || !payload) setError('Este link no está disponible. Pedile uno nuevo a tu contacto en KOI.')
      else setData(payload)
      setIsLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [token])

  const settledPayments = data?.payments.filter((payment) => payment.status === 'settled') ?? []
  const pendingPayments = data?.payments.filter((payment) => payment.status === 'pending') ?? []

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border/70 bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Logo />
          {data && <span className="text-sm font-medium text-muted-foreground">{data.client.name}</span>}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Acceso no disponible</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        )}

        {!isLoading && data && (
          <>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em]">Hola, {data.client.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Este es el estado de tu trabajo con KOI: proyectos, pagos y novedades, siempre al día.</p>
            </div>

            <section className="space-y-3" aria-label="Proyectos">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase"><FolderKanban className="size-4 text-primary" /> Proyectos</h2>
              {data.projects.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay proyectos.</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {data.projects.map((project) => (
                  <Card className="border-border/70 shadow-none" key={project.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between gap-2 text-base">
                        <span className="truncate">{project.name}</span>
                        <Badge variant="secondary" className={cn(project.status === 'active' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400')}>{projectStatusLabels[project.status] ?? project.status}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground"><span>Avance</span><span className="font-mono font-medium text-foreground">{project.progress}%</span></div>
                        <Progress value={project.progress} />
                      </div>
                      {project.deadline && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Entrega estimada: {formatShortDate(project.deadline)}</p>}
                      {project.milestones.length > 0 && (
                        <ul className="space-y-1.5 border-t border-border/70 pt-3">
                          {project.milestones.map((milestone, index) => (
                            <li className="flex items-center gap-2 text-xs" key={index}>
                              {milestone.done ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" /> : <Circle className="size-3.5 shrink-0 text-muted-foreground" />}
                              <span className={cn('truncate', milestone.done && 'text-muted-foreground line-through')}>{milestone.title}</span>
                              <span className="ml-auto shrink-0 font-mono text-muted-foreground">{formatShortDate(milestone.dueDate)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section className="space-y-3" aria-label="Pagos">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase"><Wallet className="size-4 text-primary" /> Pagos</h2>
              {data.payments.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>}
              {pendingPayments.length > 0 && (
                <Card className="overflow-hidden border-border/70 py-0 shadow-none">
                  <div className="border-b border-border/70 p-3 text-xs font-medium text-muted-foreground">Próximos pagos</div>
                  <Table className="table-fixed">
                    <TableHeader><TableRow><TableHead className="pl-4">Vencimiento</TableHead><TableHead>Método</TableHead><TableHead>Moneda</TableHead><TableHead className="pr-4 text-right">Estado</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pendingPayments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell className="pl-4 font-mono text-xs">{formatShortDate(payment.dueDate ?? payment.occurredOn)}</TableCell>
                          <TableCell className="text-xs">{payment.paymentMethod ? paymentMethodLabels[payment.paymentMethod] ?? payment.paymentMethod : '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{payment.currency}</TableCell>
                          <TableCell className="pr-4 text-right"><Badge variant="secondary" className="bg-amber-500/15 text-amber-600 dark:text-amber-400">Pendiente</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
              {settledPayments.length > 0 && (
                <Card className="overflow-hidden border-border/70 py-0 shadow-none">
                  <div className="border-b border-border/70 p-3 text-xs font-medium text-muted-foreground">Pagos realizados</div>
                  <Table className="table-fixed">
                    <TableHeader><TableRow><TableHead className="pl-4">Fecha</TableHead><TableHead>Método</TableHead><TableHead>Moneda</TableHead><TableHead className="pr-4 text-right">Estado</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {settledPayments.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell className="pl-4 font-mono text-xs">{formatShortDate(payment.settledOn ?? payment.occurredOn)}</TableCell>
                          <TableCell className="text-xs">{payment.paymentMethod ? paymentMethodLabels[payment.paymentMethod] ?? payment.paymentMethod : '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{payment.currency}</TableCell>
                          <TableCell className="pr-4 text-right"><Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Pagado</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </section>

            <section className="space-y-3" aria-label="Notas">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wider uppercase"><StickyNote className="size-4 text-primary" /> Novedades</h2>
              {data.notes.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay novedades.</p>}
              <div className="space-y-2">
                {data.notes.map((note, index) => (
                  <Card className="border-border/70 shadow-none" key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{note.projectName ?? 'General'}</span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-sm whitespace-pre-wrap">{note.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <footer className="border-t border-border/70 pt-6 pb-2 text-center text-xs text-muted-foreground">
              Portal de solo lectura generado por KOI. Si algo no cierra, escribinos.
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
