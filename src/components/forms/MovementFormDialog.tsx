import { AlertCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createFinancialMovement,
  updateFinancialMovement,
  type Currency,
  type FinancialClientOption,
  type FinancialMovementRecord,
  type FinancialMovementRecurrence,
  type FinancialMovementStatus,
  type FinancialMovementType,
  type FinancialProjectOption,
} from '@/data/repository'
import { getErrorMessage } from '@/lib/errors'
import { todayInArgentina } from '@/lib/format'

const currencies = ['ARS', 'USD', 'USDT'] as const

function parseAmount(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function emptyForm(lockedClientId?: string, lockedProjectId?: string) {
  return {
    type: 'income' as FinancialMovementType,
    status: 'pending' as FinancialMovementStatus,
    concept: '',
    category: '',
    amount: '',
    currency: 'ARS' as Currency,
    occurredOn: todayInArgentina(),
    dueDate: '',
    settledOn: '',
    clientId: lockedClientId ?? '',
    projectId: lockedProjectId ?? '',
    notes: '',
    recurrence: 'none' as FinancialMovementRecurrence,
  }
}

function movementToForm(movement: FinancialMovementRecord) {
  return {
    type: movement.type,
    status: movement.status,
    concept: movement.concept,
    category: movement.category,
    amount: String(movement.amount),
    currency: movement.currency,
    occurredOn: movement.occurredOn,
    dueDate: movement.dueDate ?? '',
    settledOn: movement.settledOn ?? '',
    clientId: movement.clientId ?? '',
    projectId: movement.projectId ?? '',
    notes: movement.notes ?? '',
    recurrence: movement.recurrence,
  }
}

interface MovementFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingMovement: FinancialMovementRecord | null
  clients: FinancialClientOption[]
  projects: FinancialProjectOption[]
  lockedClientId?: string
  lockedProjectId?: string
  onSaved: () => void | Promise<void>
}

export function MovementFormDialog({
  open,
  onOpenChange,
  editingMovement,
  clients,
  projects,
  lockedClientId,
  lockedProjectId,
  onSaved,
}: MovementFormDialogProps) {
  const [form, setForm] = useState(() => (editingMovement ? movementToForm(editingMovement) : emptyForm(lockedClientId, lockedProjectId)))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function handleStatusChange(status: FinancialMovementStatus) {
    setForm((current) => ({
      ...current,
      status,
      settledOn: status === 'settled' ? current.settledOn || todayInArgentina() : '',
    }))
  }

  function handleClientChange(clientId: string) {
    setForm((current) => ({
      ...current,
      clientId,
      projectId: current.projectId && projects.find((project) => project.id === current.projectId)?.clientId !== clientId ? '' : current.projectId,
    }))
  }

  function handleProjectChange(projectId: string) {
    const project = projects.find((item) => item.id === projectId)
    setForm((current) => ({ ...current, projectId, clientId: project?.clientId ?? current.clientId }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      const amount = parseAmount(form.amount)
      if (amount === null) {
        setError('Ingresá un importe válido mayor a cero. Podés usar coma o punto para los decimales.')
        return
      }
      const input = { ...form, amount }
      if (editingMovement) await updateFinancialMovement(editingMovement.id, input)
      else await createFinancialMovement(input)
      onOpenChange(false)
      await onSaved()
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  const visibleProjects = projects.filter((project) => !form.clientId || project.clientId === form.clientId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editingMovement ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle><DialogDescription>Registrá importes en ARS, USD o USDT. Cada moneda se informa por separado.</DialogDescription></DialogHeader>
        <form className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={handleSubmit}>
          {error && <Alert className="lg:col-span-4" variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="grid gap-2"><Label>Tipo</Label><Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as FinancialMovementType })}><SelectTrigger className="w-full" aria-label="Tipo de movimiento"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Ingreso</SelectItem><SelectItem value="expense">Egreso</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2"><Label>Estado</Label><Select value={form.status} onValueChange={(value) => handleStatusChange(value as FinancialMovementStatus)}><SelectTrigger className="w-full" aria-label="Estado del movimiento"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="settled">{form.type === 'income' ? 'Cobrado' : 'Pagado'}</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem></SelectContent></Select></div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="finance-concept">Concepto *</Label><Input id="finance-concept" required maxLength={160} value={form.concept} onChange={(event) => setForm({ ...form, concept: event.target.value })} /></div>
          <div className="grid gap-2 sm:col-span-2"><Label htmlFor="finance-category">Categoría *</Label><Input id="finance-category" required maxLength={80} placeholder={form.type === 'income' ? 'Ej. Desarrollo web' : 'Ej. Software'} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="finance-amount">Importe *</Label><Input id="finance-amount" required type="text" inputMode="decimal" autoComplete="off" placeholder={form.currency === 'USDT' ? '0,00000000' : '0,00'} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div>
          <div className="grid gap-2"><Label>Moneda</Label><Select value={form.currency} onValueChange={(value) => setForm({ ...form, currency: value as Currency })}><SelectTrigger className="w-full" aria-label="Moneda"><SelectValue /></SelectTrigger><SelectContent>{currencies.map((currency) => <SelectItem value={currency} key={currency}>{currency}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="finance-date">Fecha *</Label><Input id="finance-date" required type="date" value={form.occurredOn} onChange={(event) => setForm({ ...form, occurredOn: event.target.value })} /></div>
          <div className="grid gap-2"><Label htmlFor="finance-due">Vencimiento</Label><Input id="finance-due" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div>
          {form.status === 'settled' && <div className="grid gap-2"><Label htmlFor="finance-settled">Fecha de {form.type === 'income' ? 'cobro' : 'pago'} *</Label><Input id="finance-settled" required type="date" value={form.settledOn} onChange={(event) => setForm({ ...form, settledOn: event.target.value })} /></div>}
          <div className="grid gap-2"><Label>Cliente</Label><Select disabled={Boolean(lockedClientId)} value={form.clientId || 'none'} onValueChange={(value) => handleClientChange(value === 'none' ? '' : value)}><SelectTrigger className="w-full" aria-label="Cliente asociado"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin cliente</SelectItem>{clients.map((client) => <SelectItem value={client.id} key={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2 sm:col-span-2"><Label>Proyecto</Label><Select disabled={Boolean(lockedProjectId)} value={form.projectId || 'none'} onValueChange={(value) => handleProjectChange(value === 'none' ? '' : value)}><SelectTrigger className="w-full" aria-label="Proyecto asociado"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin proyecto</SelectItem>{visibleProjects.map((project) => <SelectItem value={project.id} key={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/30 p-3 sm:col-span-2 lg:col-span-4">
            <input id="finance-recurring" type="checkbox" className="mt-0.5 size-4 accent-primary" checked={form.recurrence === 'monthly'} onChange={(event) => setForm({ ...form, recurrence: event.target.checked ? 'monthly' : 'none' })} />
            <Label htmlFor="finance-recurring" className="font-normal leading-5"><span className="font-medium">Pago mensual recurrente</span><span className="mt-0.5 block text-xs text-muted-foreground">Se genera automáticamente el próximo mes en la misma fecha. {editingMovement && form.recurrence === 'monthly' ? 'Destildá para cortar la recurrencia hacia adelante.' : 'Cada mes queda como un registro editable por separado.'}</span></Label>
          </div>
          <div className="grid gap-2 sm:col-span-2 lg:col-span-4"><Label htmlFor="finance-notes">Notas</Label><Textarea id="finance-notes" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end lg:col-span-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : editingMovement ? 'Guardar cambios' : 'Guardar movimiento'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
