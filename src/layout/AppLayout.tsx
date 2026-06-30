import { useLocation } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { AppSidebar } from '@/components/app-sidebar'
import { ModeToggle } from '@/components/mode-toggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { navigation } from './navigation'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  if (!user) return null

  const currentPage = navigation.find(({ to }) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to),
  )?.label ?? 'Back office'

  return (
    <SidebarProvider>
      <AppSidebar user={user} onSignOut={() => void signOut()} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbPage>{currentPage}</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>
          <div className="ml-auto flex items-center gap-3"><span className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"><i className="size-1.5 rounded-full bg-emerald-500" /> Sistema operativo</span><ModeToggle /></div>
        </header>
        <div className="mx-auto w-full max-w-[1500px] flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></div>
      </SidebarInset>
    </SidebarProvider>
  )
}
