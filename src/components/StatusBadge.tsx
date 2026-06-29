import type { ClientStatus, ProjectStatus } from '../data/repository'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Status = ClientStatus | ProjectStatus

const statusLabels: Record<Status, string> = {
  lead: 'Prospecto',
  active: 'Activo',
  paused: 'Pausado',
  closed: 'Cerrado',
  done: 'Finalizado',
}

interface StatusBadgeProps {
  status: Status
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusClasses: Record<Status, string> = {
    active: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    lead: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400',
    paused: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    closed: 'border-border bg-muted text-muted-foreground',
    done: 'border-border bg-muted text-muted-foreground',
  }
  return <Badge variant="outline" className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold', statusClasses[status])}>{statusLabels[status]}</Badge>
}
