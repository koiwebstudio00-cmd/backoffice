import { Link } from 'react-router-dom'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link to="/">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg rounded-br-sm bg-sidebar-primary font-black text-sidebar-primary-foreground">K</div>
            <div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">Koi Software</span><span className="truncate text-xs text-sidebar-foreground/55">Workspace interno</span></div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
