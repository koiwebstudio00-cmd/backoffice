import { ChevronsUpDownIcon, LogOutIcon, ShieldCheckIcon } from 'lucide-react'
import type { TeamUser } from '@/auth/auth-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

interface NavUserProps {
  user: TeamUser
  onSignOut: () => void
}

export function NavUser({ user, onSignOut }: NavUserProps) {
  const { isMobile } = useSidebar()
  const initials = user.fullName.slice(0, 2).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">{initials}</AvatarFallback></Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-medium">{user.fullName}</span><span className="truncate text-xs text-sidebar-foreground/55">{user.email}</span></div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="font-normal"><div className="flex items-center gap-2 px-1 py-1.5"><Avatar className="size-8 rounded-lg"><AvatarFallback className="rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">{initials}</AvatarFallback></Avatar><div className="grid text-left text-sm leading-tight"><span className="font-medium">{user.fullName}</span><span className="text-xs text-muted-foreground">{user.email}</span></div></div></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled><ShieldCheckIcon /> {user.role === 'owner' ? 'Owner' : 'Miembro'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}><LogOutIcon /> Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
