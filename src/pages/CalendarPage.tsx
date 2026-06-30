import { AlertCircle, ArrowUpRight, CalendarClock, ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { CalendarItemRow } from '@/components/CalendarItemRow'
import { PageHeader } from '@/components/PageHeader'
import { MeetingFormDialog } from '@/components/forms/MeetingFormDialog'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  deleteMeeting,
  listFinancialMovements,
  listMeetings,
  listProjects,
  type FinancialMovementRecord,
  type MeetingRecord,
  type ProjectRecord,
} from '@/data/repository'
import {
  addDays,
  addMonths,
  argTime,
  buildCalendarItems,
  calendarTypeStyles,
  dayNumber,
  firstOfMonth,
  mondayOf,
  monthOf,
  sortCalendarItems,
  type CalendarItem,
  type CalendarItemType,
} from '@/lib/calendar'
import { getErrorMessage } from '@/lib/errors'
import { todayInArgentina } from '@/lib/format'
import { cn } from '@/lib/utils'

type ViewMode = 'month' | 'week' | 'day'
const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function monthLabel(cursor: string): string {
  const label = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${monthOf(cursor)}-01T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function rangeLabel(start: string, end: string): string {
  const fmt = (value: string) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${value}T00:00:00Z`))
  return `${fmt(start)} – ${fmt(end)}`
}

function dayLabel(cursor: string): string {
  const label = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${cursor}T00:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function CalendarPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [movements, setMovements] = useState<FinancialMovementRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(() => todayInArgentina())
  const [dialog, setDialog] = useState<{ meeting: MeetingRecord | null } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MeetingRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null)

  async function loadData() {
    const [nextMeetings, nextProjects, nextMovements] = await Promise.all([
      listMeetings(),
      listProjects(),
      isOwner ? listFinancialMovements() : Promise.resolve<FinancialMovementRecord[]>([]),
    ])
    setMeetings(nextMeetings)
    setProjects(nextProjects)
    setMovements(nextMovements)
  }

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      listMeetings(),
      listProjects(),
      isOwner ? listFinancialMovements() : Promise.resolve<FinancialMovementRecord[]>([]),
    ]).then(([nextMeetings, nextProjects, nextMovements]) => {
      if (cancelled) return
      setMeetings(nextMeetings)
      setProjects(nextProjects)
      setMovements(nextMovements)
      setError(null)
    }).catch((loadError: unknown) => {
      if (!cancelled) setError(getErrorMessage(loadError))
    }).finally(() => {
      if (!cancelled) setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [isOwner])

  const projectOptions = useMemo(() => projects.map((project) => ({ id: project.id, name: project.name })), [projects])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of buildCalendarItems(meetings, projects, movements)) {
      const bucket = map.get(item.date)
      if (bucket) bucket.push(item)
      else map.set(item.date, [item])
    }
    for (const [date, items] of map) map.set(date, sortCalendarItems(items))
    return map
  }, [meetings, projects, movements])

  const today = todayInArgentina()
  const legendTypes = (['meeting', 'deadline', 'milestone', 'task', 'payment'] as CalendarItemType[]).filter((type) => type !== 'payment' || isOwner)

  function goPrev() {
    setCursor((current) => view === 'month' ? addMonths(current, -1) : view === 'week' ? addDays(current, -7) : addDays(current, -1))
  }
  function goNext() {
    setCursor((current) => view === 'month' ? addMonths(current, 1) : view === 'week' ? addDays(current, 7) : addDays(current, 1))
  }

  const label = view === 'month' ? monthLabel(cursor) : view === 'week' ? rangeLabel(mondayOf(cursor), addDays(mondayOf(cursor), 6)) : dayLabel(cursor)

  async function handleDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deleteMeeting(pendingDelete.id)
      setPendingDelete(null)
      await loadData()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError))
      setPendingDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Agenda" title="Calendario" description="Reuniones, deadlines, hitos y vencimientos en una sola vista." action={<Button onClick={() => setDialog({ meeting: null })}><Plus /> Nueva reunión</Button>} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCursor(today)}>Hoy</Button>
          <Button variant="ghost" size="icon-sm" aria-label="Anterior" onClick={goPrev}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon-sm" aria-label="Siguiente" onClick={goNext}><ChevronRight /></Button>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
          {([['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']] as [ViewMode, string][]).map(([mode, text]) => (
            <button type="button" key={mode} onClick={() => setView(mode)} className={cn('rounded-md px-3 py-1 font-medium transition-colors', view === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>{text}</button>
          ))}
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>No se pudo cargar el calendario</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {legendTypes.map((type) => (
          <span className="inline-flex items-center gap-1.5" key={type}><span className={cn('size-2 rounded-full', calendarTypeStyles[type].dot)} /> {calendarTypeStyles[type].label}</span>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : view === 'month' ? (
        <MonthView cursor={cursor} today={today} itemsByDate={itemsByDate} onSelect={setSelectedItem} />
      ) : view === 'week' ? (
        <WeekView cursor={cursor} today={today} itemsByDate={itemsByDate} onSelect={setSelectedItem} />
      ) : (
        <DayView cursor={cursor} itemsByDate={itemsByDate} onSelect={setSelectedItem} />
      )}

      <CalendarItemDetailDialog
        item={selectedItem}
        isOwner={isOwner}
        onClose={() => setSelectedItem(null)}
        onEditMeeting={(meeting) => { setSelectedItem(null); setDialog({ meeting }) }}
        onDeleteMeeting={(meeting) => { setSelectedItem(null); setPendingDelete(meeting) }}
      />

      {dialog && (
        <MeetingFormDialog
          open
          onOpenChange={(open) => { if (!open) setDialog(null) }}
          editing={dialog.meeting}
          projects={projectOptions}
          onSaved={loadData}
          onRequestDelete={isOwner && dialog.meeting ? () => { const meeting = dialog.meeting; setDialog(null); setPendingDelete(meeting) } : undefined}
        />
      )}

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !isDeleting) setPendingDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar esta reunión?</AlertDialogTitle><AlertDialogDescription>“{pendingDelete?.title}” se eliminará de forma permanente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={isDeleting} onClick={(event) => { event.preventDefault(); void handleDelete() }}>{isDeleting ? 'Eliminando…' : 'Eliminar reunión'}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ViewProps {
  cursor: string
  today: string
  itemsByDate: Map<string, CalendarItem[]>
  onSelect: (item: CalendarItem) => void
}

function WeekView({ cursor, today, itemsByDate, onSelect }: ViewProps) {
  const start = mondayOf(cursor)
  return (
    <div className="grid gap-2 lg:grid-cols-7">
      {Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index)
        const items = itemsByDate.get(date) ?? []
        const isToday = date === today
        return (
          <div className={cn('flex min-h-44 flex-col rounded-xl border bg-card p-2', isToday ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/70')} key={date}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <span className="text-[11px] font-medium text-muted-foreground">{weekdayLabels[index]}</span>
              <span className={cn('font-mono text-sm font-semibold', isToday && 'text-primary')}>{dayNumber(date)}</span>
            </div>
            <div className="flex-1 space-y-1.5">
              {items.map((item) => <CalendarItemRow item={item} key={item.id} onSelect={onSelect} />)}
              {items.length === 0 && <p className="px-1 text-[10px] text-muted-foreground/70">—</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MonthView({ cursor, today, itemsByDate, onSelect }: ViewProps) {
  const start = mondayOf(firstOfMonth(cursor))
  const currentMonth = monthOf(cursor)
  const cells = Array.from({ length: 42 }, (_, index) => addDays(start, index))
  const trailingEmptyWeek = cells.slice(35).every((date) => monthOf(date) !== currentMonth)
  const visibleCells = trailingEmptyWeek ? cells.slice(0, 35) : cells

  return (
    <div>
      <div className="hidden grid-cols-7 gap-2 px-1 pb-1 lg:grid">
        {weekdayLabels.map((label) => <span className="text-[11px] font-medium text-muted-foreground" key={label}>{label}</span>)}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {visibleCells.map((date) => {
          const items = itemsByDate.get(date) ?? []
          const isToday = date === today
          const outside = monthOf(date) !== currentMonth
          return (
            <div className={cn('flex min-h-28 flex-col rounded-xl border p-1.5', isToday ? 'border-primary/50 bg-card ring-1 ring-primary/20' : 'border-border/70 bg-card', outside && 'opacity-45')} key={date}>
              <div className="mb-1 px-1 text-right"><span className={cn('font-mono text-xs font-semibold', isToday && 'text-primary')}>{dayNumber(date)}</span></div>
              <div className="flex-1 space-y-1">
                {items.slice(0, 3).map((item) => <CalendarItemRow item={item} key={item.id} onSelect={onSelect} />)}
                {items.length > 3 && <p className="px-1 text-[10px] font-medium text-muted-foreground">+{items.length - 3} más</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView({ cursor, itemsByDate, onSelect }: Omit<ViewProps, 'today'>) {
  const items = itemsByDate.get(cursor) ?? []
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      {items.length > 0 ? items.map((item) => <CalendarItemRow item={item} key={item.id} onSelect={onSelect} />)
        : <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">Nada para este día.</div>}
    </div>
  )
}

interface CalendarItemDetailDialogProps {
  item: CalendarItem | null
  isOwner: boolean
  onClose: () => void
  onEditMeeting: (meeting: MeetingRecord) => void
  onDeleteMeeting: (meeting: MeetingRecord) => void
}

function CalendarItemDetailDialog({ item, isOwner, onClose, onEditMeeting, onDeleteMeeting }: CalendarItemDetailDialogProps) {
  const meeting = item?.meeting ?? null
  const linkLabel = item?.type === 'payment' ? 'Ver en Finanzas' : 'Ver proyecto'

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><span className={cn('size-2.5 shrink-0 rounded-full', calendarTypeStyles[item.type].dot)} /> <span className="min-w-0 truncate">{item.title}</span></DialogTitle>
              <DialogDescription>{calendarTypeStyles[item.type].label}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2.5 pt-1 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><CalendarClock className="size-4 shrink-0" /> <span>{dayLabel(item.date)}{item.time ? ` · ${item.time}${meeting?.endsAt ? `–${argTime(meeting.endsAt)}` : ''}` : ''}</span></div>
              {meeting?.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4 shrink-0" /> <span className="min-w-0 break-words">{meeting.location}</span></div>}
              {meeting && meeting.projectNames.length > 0 && <div className="flex flex-wrap gap-1.5">{meeting.projectNames.map((name) => <Badge variant="outline" key={name} className="text-[10px]">{name}</Badge>)}</div>}
              {!meeting && item.meta && <p className="text-muted-foreground">{item.meta}</p>}
              {meeting?.notes && <p className="rounded-lg border border-border/70 bg-muted/40 p-3 whitespace-pre-wrap">{meeting.notes}</p>}
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              {meeting ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEditMeeting(meeting)}><Pencil /> Editar</Button>
                  {isOwner && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDeleteMeeting(meeting)}><Trash2 /> Eliminar</Button>}
                </div>
              ) : <span className="hidden sm:block" />}
              {item.to
                ? <Button asChild size="sm"><Link to={item.to} onClick={onClose}>{linkLabel} <ArrowUpRight /></Link></Button>
                : !meeting && <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
