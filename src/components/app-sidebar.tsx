import { FolderKanban, LayoutDashboard, Settings2, Wrench } from 'lucide-react'
import type { TeamUser } from '@/auth/auth-context'
import { NavMain, type NavMainItem } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: TeamUser
  onSignOut: () => void
}

export function AppSidebar({ user, onSignOut, ...props }: AppSidebarProps) {
  const items: NavMainItem[] = [
    { title: 'Resumen', url: '/', icon: LayoutDashboard },
    {
      title: 'Operación',
      url: '/clientes',
      icon: FolderKanban,
      items: [
        { title: 'Clientes', url: '/clientes' },
        { title: 'Proyectos', url: '/proyectos' },
        { title: 'Calendario', url: '/calendario' },
      ],
    },
  ]

  if (user.role === 'owner') {
    items.push({
      title: 'Administración',
      url: '/finanzas',
      icon: Settings2,
      items: [
        { title: 'Finanzas', url: '/finanzas' },
        { title: 'Credenciales', url: '/credenciales' },
      ],
    })
  }

  items.push({
    title: 'Backoffice',
    url: '/features',
    icon: Wrench,
    items: [
      { title: 'Features', url: '/features' },
    ],
  })

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader><TeamSwitcher /></SidebarHeader>
      <SidebarContent><NavMain items={items} /></SidebarContent>
      <SidebarFooter><NavUser user={user} onSignOut={onSignOut} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
