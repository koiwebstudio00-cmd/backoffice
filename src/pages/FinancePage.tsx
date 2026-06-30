import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth/auth-context'
import { PageHeader } from '@/components/PageHeader'
import { MovementFormDialog } from '@/components/forms/MovementFormDialog'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  deleteFinancialMovement,
  listFinancialMovements,
  listFinancialReferences,
  type Currency,
  type FinancialClientOption,
  type FinancialMovementRecord,
  type FinancialMovementStatus,
  type FinancialMovementType,
  type FinancialProjectOption,
} from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { formatMoney, formatShortDate, todayInArgentina } from '@/lib/format'
import { cn } from '@/lib/utils'

const currencies = ['ARS', 'USD', 'USDT'] as const
type MovementFilter = 'all' | FinancialMovementType
type StatusFilter = 'all' | FinancialMovementStatus
type CurrencyFilter = 'all' | Currency

function statusLabel(movement: FinancialMovementRecord): string {
  if (movement.status === 'pending') return 'Pendiente'
  if (movement.status === 'cancelled') return 'Cancelado'
  return movement.type === 'income' ? 'Cobrado' : 'Pagado'
}

function statusClass(status: FinancialMovementStatus): string {
  if (status === 'settled') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
  if (status === 'pending') return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400'
  return 'border-border bg-muted text-muted-foreground'
}

export function FinancePage() {
  const { user } = useAuth()
  const [movements, setMovements] = useState<FinancialMovementRecord[]>([])
  const [clients, setClients] = useState<FinancialClientOption[]>([])
  const [projects, setProjects] = useState<FinancialProjectOption[]>([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<MovementFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogState, setDialogState] = useState<{ movement: FinancialMovementRecord | null } | null>(null)
  const [movementPendingDelete, setMovementPendingDelete] = useState<FinancialMovementRecord | null>(null)

  async function loadData() {
    if (user?.role !== 'owner') return
    try {
      const [nextMovements, references] = await Promise.all([
        listFinancialMovements(),
        listFinancialReferences(),
      ])
      setMovements(nextMovements)
      setClients(references.clients)
      setProjects(references.projects)
      setError(null)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role !== 'owner') return
    let cancelled = false
    void Promise.all([listFinancialMovements(), listFinancialReferences()]).then(([nextMovements, references]) => {
      if (cancelled) return
      setMovements(nextMovements)
      setClients(references.clients)
      setProjects(references.projects)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [user?.role])

  const summaries = useMemo(() => currencies.map((currency) => {
    const matching = movements.filter((movement) => movement.currency === currency)
    const settledIncome = matching.filter((movement) => movement.type === 'income' && movement.status === 'settled').reduce((sum, movement) => sum + movement.amount, 0)
    const settledExpense = matching.filter((movement) => movement.type === 'expense' && movement.status === 'settled').reduce((sum, movement) => sum + movement.amount, 0)
    const pendingIncome = matching.filter((movement) => movement.type === 'income' && movement.status === 'pending').reduce((sum, movement) => sum + movement.amount, 0)
    const pendingExpense = matching.filter((movement) => movement.type === 'expense' && movement.status === 'pending').reduce((sum, movement) => sum + movement.amount, 0)
    return { currency, settledIncome, settledExpense, pendingIncome, pendingExpense, balance: settledIncome - settledExpense }
  }), [movements])

  const overdue = useMemo(() => {
    const today = todayInArgentina()
    return movements.filter((movement) => movement.status === 'pending' && movement.dueDate && movement.dueDate < today)
  }, [movements])

  const projectResults = useMemo(() => projects.map((project) => {
    const values = { ARS: 0, USD: 0, USDT: 0 } satisfies Record<Currency, number>
    movements.forEach((movement) => {
      if (movement.projectId !== project.id || movement.status !== 'settled') return
      values[movement.currency] += movement.type === 'income' ? movement.amount : -movement.amount
    })
    return { ...project, values }
  }).filter((project) => currencies.some((currency) => project.values[currency] !== 0)), [movements, projects])

  const filteredMovements = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return movements.filter((movement) => {
      const matchesQuery = !normalizedQuery || [movement.concept, movement.category, movement.clientName, movement.projectName]
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
      return matchesQuery
        && (typeFilter === 'all' || movement.type === typeFilter)
        && (statusFilter === 'all' || movement.status === statusFilter)
        && (currencyFilter === 'all' || movement.currency === currencyFilter)
    })
  }, [currencyFilter, movements, query, statusFilter, typeFilter])

  async function handleDelete() {
    if (!movementPendingDelete) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteFinancialMovement(movementPendingDelete.id)
      setMovementPendingDelete(null)
      await loadData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setMovementPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  if (user?.role !== 'owner') {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Control" title="Finanzas" description="Ingresos, egresos y resultados separados por moneda." />
        <Alert><ShieldAlert className="size-4" /><AlertTitle>Acceso restringido</AlertTitle><AlertDescription>Los datos financieros están disponibles únicamente para usuarios con rol owner.</AlertDescription></Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Control" title="Finanzas" description="Caja realizada, compromisos y resultado por proyecto sin mezclar monedas." action={<Button onClick={() => setDialogState({ movement: null })}><Plus /> Nuevo movimiento</Button>} />

      {dialogState && (
        <MovementFormDialog
          open
          onOpenChange={(open) => { if (!open) setDialogState(null) }}
          editingMovement={dialogState.movement}
          clients={clients}
          projects={projects}
          onSaved={loadData}
        />
      )}

      <AlertDialog open={Boolean(movementPendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setMovementPendingDelete(null) }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle><AlertDialogDescription>“{movementPendingDelete?.concept}” se eliminará de forma permanente y dejará de formar parte de los resultados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar movimiento'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo cargar Finanzas</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {isLoading && <div className="space-y-4"><div className="grid gap-3 lg:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div><Skeleton className="h-80" /></div>}

      {!isLoading && <>
        <section className="grid overflow-hidden rounded-2xl border border-border/70 bg-card lg:grid-cols-3" aria-label="Caja por moneda">
          {summaries.map((summary, index) => (
            <article className={cn('relative p-5 sm:p-6', index > 0 && 'border-t border-border/70 lg:border-t-0 lg:border-l')} key={summary.currency}>
              <div className="mb-8 flex items-center justify-between"><span className="font-mono text-xs font-semibold tracking-[0.18em] text-muted-foreground">{summary.currency}</span><span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"><CircleDollarSign className="size-4" /></span></div>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Caja realizada</span>
              <strong className={cn('mt-2 block font-mono text-2xl font-semibold tracking-tight', summary.balance < 0 && 'text-destructive')}>{formatMoney(summary.balance, summary.currency)}</strong>
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-4 text-xs"><div><span className="text-muted-foreground">Ingresó</span><b className="mt-1 block font-mono text-foreground">{formatMoney(summary.settledIncome, summary.currency)}</b></div><div><span className="text-muted-foreground">Salió</span><b className="mt-1 block font-mono text-foreground">{formatMoney(summary.settledExpense, summary.currency)}</b></div><div><span className="text-muted-foreground">Por cobrar</span><b className="mt-1 block font-mono text-foreground">{formatMoney(summary.pendingIncome, summary.currency)}</b></div><div><span className="text-muted-foreground">Por pagar</span><b className="mt-1 block font-mono text-foreground">{formatMoney(summary.pendingExpense, summary.currency)}</b></div></div>
            </article>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.55fr]">
          <Card className="overflow-hidden border-border/70 py-0 shadow-none">
            <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center">
              <div className="relative flex-1"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" type="search" aria-label="Buscar movimientos" placeholder="Buscar concepto, categoría, cliente o proyecto…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as MovementFilter)}><SelectTrigger className="w-full lg:w-32" aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="income">Ingresos</SelectItem><SelectItem value="expense">Egresos</SelectItem></SelectContent></Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}><SelectTrigger className="w-full lg:w-32" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Estados</SelectItem><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="settled">Realizado</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select>
              <Select value={currencyFilter} onValueChange={(value) => setCurrencyFilter(value as CurrencyFilter)}><SelectTrigger className="w-full lg:w-28" aria-label="Filtrar por moneda"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Monedas</SelectItem>{currencies.map((currency) => <SelectItem value={currency} key={currency}>{currency}</SelectItem>)}</SelectContent></Select>
            </div>
            {filteredMovements.length > 0 ? <Table><TableHeader><TableRow><TableHead>Movimiento</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Importe</TableHead><TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead></TableRow></TableHeader><TableBody>{filteredMovements.map((movement) => { const TypeIcon = movement.type === 'income' ? ArrowDownLeft : ArrowUpRight; return <TableRow key={movement.id}><TableCell><div className="flex min-w-52 items-center gap-3"><span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', movement.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive')}><TypeIcon className="size-4" /></span><div><div className="flex items-center gap-1.5"><strong className="text-sm font-medium">{movement.concept}</strong>{movement.recurrence === 'monthly' && <Badge variant="secondary" className="gap-1 text-[9px]"><Repeat className="size-2.5" /> Mensual</Badge>}</div><small className="mt-1 block text-xs text-muted-foreground">{movement.category}{movement.projectName ? ` · ${movement.projectName}` : movement.clientName ? ` · ${movement.clientName}` : ''}</small></div></div></TableCell><TableCell><Badge variant="outline" className={cn('rounded-full text-[10px]', statusClass(movement.status))}>{statusLabel(movement)}</Badge></TableCell><TableCell><span className="text-xs">{formatShortDate(movement.occurredOn)}</span>{movement.status === 'pending' && movement.dueDate && <small className={cn('mt-1 flex items-center gap-1 text-[10px] text-muted-foreground', movement.dueDate < todayInArgentina() && 'text-destructive')}><CalendarClock className="size-3" /> Vence {formatShortDate(movement.dueDate)}</small>}</TableCell><TableCell className={cn('text-right font-mono text-xs font-semibold', movement.type === 'expense' && 'text-destructive')}>{movement.type === 'expense' ? '−' : '+'}{formatMoney(movement.amount, movement.currency)}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label={`Acciones para ${movement.concept}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setDialogState({ movement })}><Pencil /> Editar</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setMovementPendingDelete(movement)}><Trash2 /> Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow> })}</TableBody></Table> : <div className="grid min-h-64 place-items-center p-8 text-center"><div><Search className="mx-auto mb-3 size-5 text-muted-foreground" /><strong className="block text-sm">{movements.length === 0 ? 'Todavía no hay movimientos' : 'No hay resultados para estos filtros'}</strong><span className="mt-1 block text-xs text-muted-foreground">{movements.length === 0 ? 'Registrá el primer ingreso o egreso para comenzar.' : 'Probá otra búsqueda o combinación de filtros.'}</span>{movements.length === 0 && <Button className="mt-4" size="sm" onClick={() => setDialogState({ movement: null })}><Plus /> Nuevo movimiento</Button>}</div></div>}
          </Card>

          <div className="space-y-4">
            <Card className="border-border/70 shadow-none"><CardHeader><CardTitle className="flex items-center justify-between text-sm">Vencimientos atrasados <Badge variant={overdue.length > 0 ? 'destructive' : 'secondary'}>{overdue.length}</Badge></CardTitle></CardHeader><CardContent className="space-y-3">{overdue.slice(0, 4).map((movement) => <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 first:border-0 first:pt-0" key={movement.id}><div className="min-w-0"><strong className="block truncate text-xs font-medium">{movement.concept}</strong><small className="text-[10px] text-muted-foreground">{movement.dueDate ? formatShortDate(movement.dueDate) : ''}</small></div><span className="shrink-0 font-mono text-[10px]">{formatMoney(movement.amount, movement.currency)}</span></div>)}{overdue.length === 0 && <p className="text-xs leading-5 text-muted-foreground">No hay cobros ni pagos vencidos.</p>}</CardContent></Card>
            <Card className="border-border/70 shadow-none"><CardHeader><CardTitle className="text-sm">Resultado realizado por proyecto</CardTitle></CardHeader><CardContent className="space-y-4">{projectResults.slice(0, 6).map((project) => <div className="border-t border-border/70 pt-3 first:border-0 first:pt-0" key={project.id}><strong className="block truncate text-xs font-medium">{project.name}</strong><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{currencies.filter((currency) => project.values[currency] !== 0).map((currency) => <span className={cn('font-mono text-[10px]', project.values[currency] < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')} key={currency}>{formatMoney(project.values[currency], currency)}</span>)}</div></div>)}{projectResults.length === 0 && <p className="text-xs leading-5 text-muted-foreground">Los resultados aparecerán cuando registres movimientos realizados asociados a proyectos.</p>}</CardContent></Card>
          </div>
        </div>
      </>}
    </div>
  )
}
