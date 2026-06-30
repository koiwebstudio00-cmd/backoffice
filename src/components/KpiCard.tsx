import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  helper: string
  trend?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  tone?: 'green' | 'orange' | 'blue' | 'plum'
  to?: string
}

export function KpiCard({
  label,
  value,
  helper,
  trend = 'neutral',
  icon: Icon,
  tone = 'green',
  to,
}: KpiCardProps) {
  const toneClasses = {
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    orange: 'bg-primary/12 text-primary',
    blue: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    plum: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  }

  const content = (
    <CardContent className="p-5">
      <div className={cn('absolute top-4 right-4 grid size-9 place-items-center rounded-xl', toneClasses[tone])}>
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </div>
      <p className="mb-4 pr-12 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <strong className="font-mono text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</strong>
      <p className={cn('mt-2 flex items-center gap-1 text-xs text-muted-foreground', trend === 'up' && 'text-emerald-600 dark:text-emerald-400', trend === 'down' && 'text-destructive')}>
        {trend === 'up' && <ArrowUpRight className="size-3.5" />}
        {trend === 'down' && <ArrowDownRight className="size-3.5" />}
        {helper}
      </p>
    </CardContent>
  )

  if (to) {
    return (
      <Card className="relative overflow-hidden border-border/70 py-0 shadow-none transition-colors hover:border-primary/40">
        <Link to={to} className="block outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{content}</Link>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden border-border/70 py-0 shadow-none">
      {content}
    </Card>
  )
}
