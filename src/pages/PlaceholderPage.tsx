import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface PlaceholderPageProps {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  milestones: string[]
}

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  milestones,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <Card className="overflow-hidden border-border/70 py-0 shadow-none">
        <CardContent className="grid min-h-[380px] items-center gap-10 p-8 md:grid-cols-[0.7fr_1fr] md:p-12">
          <div className="relative mx-auto grid size-48 place-items-center rounded-full border border-primary/15 bg-primary/5">
            <div className="absolute inset-5 rounded-full border border-dashed border-primary/25" />
            <span className="relative grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Icon className="size-7" /></span>
          </div>
          <div>
            <Badge className="mb-5 gap-1.5 bg-primary/10 text-primary hover:bg-primary/10"><Sparkles className="size-3.5" /> Próximo incremento</Badge>
            <h2 className="mb-3 text-2xl font-semibold tracking-[-0.035em]">La estructura ya está preparada.</h2>
            <p className="mb-6 max-w-xl text-sm leading-6 text-muted-foreground">Este módulo se conectará sobre el mismo modelo de permisos y navegación que ya está operativo.</p>
            <ul className="space-y-3">
              {milestones.map((milestone) => <li className="flex items-center gap-2 text-sm" key={milestone}><ArrowRight className="size-4 text-primary" /> {milestone}</li>)}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
