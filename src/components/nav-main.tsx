import type { LucideIcon } from 'lucide-react'
import { ChevronRightIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

export interface NavMainItem {
  title: string
  url: string
  icon: LucideIcon
  items?: { title: string; url: string }[]
}

interface NavMainProps {
  items: NavMainItem[]
}

export function NavMain({ items }: NavMainProps) {
  const location = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Espacio de trabajo</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const Icon = item.icon
          const isActive = item.url === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.url) || item.items?.some(({ url }) => location.pathname.startsWith(url))

          if (!item.items?.length) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                  <NavLink to={item.url} end={item.url === '/'}>
                    <Icon />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          return (
            <Collapsible key={item.title} asChild defaultOpen={isActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    <Icon />
                    <span>{item.title}</span>
                    <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild isActive={location.pathname.startsWith(subItem.url)}>
                          <NavLink to={subItem.url}>{subItem.title}</NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
