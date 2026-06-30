import type { FinancialMovementRecord, MeetingRecord, ProjectRecord } from '../data/repository'
import { formatMoney } from './format'

export const TZ = 'America/Argentina/Tucuman'

export type CalendarItemType = 'meeting' | 'deadline' | 'milestone' | 'task' | 'payment'

export interface CalendarItem {
  id: string
  date: string
  time: string | null
  type: CalendarItemType
  title: string
  meta: string | null
  to?: string
  meeting?: MeetingRecord
}

export const calendarTypeStyles: Record<CalendarItemType, { dot: string; label: string }> = {
  meeting: { dot: 'bg-primary', label: 'Reunión' },
  deadline: { dot: 'bg-destructive', label: 'Entrega' },
  milestone: { dot: 'bg-violet-500', label: 'Hito' },
  task: { dot: 'bg-sky-500', label: 'Tarea' },
  payment: { dot: 'bg-amber-500', label: 'Pago' },
}

export function addDays(dateStr: string, amount: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function addMonths(dateStr: string, amount: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + amount)
  return date.toISOString().slice(0, 10)
}

export function mondayOf(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return addDays(dateStr, -((weekday + 6) % 7))
}

export function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`
}

export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function argDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

export function argTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

export function dayNumber(dateStr: string): string {
  return String(Number(dateStr.split('-')[2]))
}

export function sortCalendarItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time)
    if (a.time) return -1
    if (b.time) return 1
    return a.type.localeCompare(b.type)
  })
}

export function buildCalendarItems(
  meetings: MeetingRecord[],
  projects: ProjectRecord[],
  movements: FinancialMovementRecord[],
): CalendarItem[] {
  const result: CalendarItem[] = []

  for (const meeting of meetings) {
    result.push({
      id: `meeting-${meeting.id}`,
      date: argDate(meeting.startsAt),
      time: argTime(meeting.startsAt),
      type: 'meeting',
      title: meeting.title,
      meta: meeting.projectNames.length > 0 ? meeting.projectNames.join(', ') : meeting.location,
      meeting,
    })
  }

  for (const project of projects) {
    if (project.deadline) {
      result.push({ id: `deadline-${project.id}`, date: project.deadline, time: null, type: 'deadline', title: `Entrega: ${project.name}`, meta: project.clientName, to: `/proyectos/${project.id}` })
    }
    for (const milestone of project.milestones) {
      if (milestone.done) continue
      result.push({ id: `milestone-${milestone.id}`, date: milestone.dueDate, time: null, type: 'milestone', title: milestone.title, meta: project.name, to: `/proyectos/${project.id}` })
    }
    for (const task of project.tasks) {
      if (!task.dueDate || task.status === 'done') continue
      result.push({ id: `task-${task.id}`, date: task.dueDate, time: null, type: 'task', title: task.title, meta: project.name, to: `/proyectos/${project.id}` })
    }
  }

  for (const movement of movements) {
    if (movement.status !== 'pending' || !movement.dueDate) continue
    result.push({ id: `payment-${movement.id}`, date: movement.dueDate, time: null, type: 'payment', title: movement.concept, meta: formatMoney(movement.amount, movement.currency), to: '/finanzas' })
  }

  return result
}
