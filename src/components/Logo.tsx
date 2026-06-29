import { cn } from '@/lib/utils'

interface LogoProps {
  compact?: boolean
  inverse?: boolean
}

export function Logo({ compact = false, inverse = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', inverse ? 'text-white' : 'text-foreground')} aria-label="Koi Office">
      <span className="grid size-8 rotate-3 place-items-center rounded-xl rounded-br-sm bg-primary text-sm font-black text-primary-foreground shadow-sm shadow-primary/20" aria-hidden="true">
        K
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[-0.02em]">
          Koi <strong className="font-normal opacity-55">Office</strong>
        </span>
      )}
    </div>
  )
}
