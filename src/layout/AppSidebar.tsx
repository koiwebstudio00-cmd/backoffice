import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { TeamUser } from '@/auth/auth-context'
import { Logo } from '@/components/Logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { navigation } from './navigation'

interface AppSidebarProps {
  user: TeamUser
  onNavigate?: () => void
  onSignOut: () => void
}

export function AppSidebar({ user, onNavigate, onSignOut }: AppSidebarProps) {
  const visibleNavigation = navigation.filter((item) => !item.ownerOnly || user.role === 'owner')

  return (
    <div className="flex h-full flex-col bg-[#111113] text-zinc-300">
      <div className="flex h-16 items-center px-5">
        <Logo inverse />
      </div>
      <Separator className="bg-white/8" />
      <div className="px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-[10px] font-black text-primary-foreground">KS</span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">Koi Software</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">Workspace interno</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Navegación principal">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.16em] text-zinc-600 uppercase">Operación</p>
        {visibleNavigation.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/6 hover:text-white',
              isActive && 'bg-white/[0.075] text-white before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary',
            )}
          >
            <Icon className="size-[17px]" strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3">
        <Separator className="mb-3 bg-white/8" />
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Avatar className="size-8 border border-white/10">
            <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold text-white">{user.fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user.fullName}</p>
            <p className="mt-0.5 text-[10px] capitalize text-zinc-500">{user.role}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="text-zinc-500 hover:bg-white/6 hover:text-white" variant="ghost" size="icon-sm" aria-label="Cerrar sesión" onClick={onSignOut}>
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cerrar sesión</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
