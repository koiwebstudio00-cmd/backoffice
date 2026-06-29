import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow && <p className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p>}
        <h1 className="text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </header>
  )
}
