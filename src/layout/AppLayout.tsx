import { ChevronRight, Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/auth-context'
import { ModeToggle } from '@/components/mode-toggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { AppSidebar } from './AppSidebar'
import { navigation } from './navigation'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()

  if (!user) return null

  const currentPage = navigation.find(({ to }) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to),
  )?.label ?? 'Back office'

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <AppSidebar user={user} onSignOut={() => void signOut()} />
      </aside>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-60 border-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <AppSidebar user={user} onNavigate={() => setIsSidebarOpen(false)} onSignOut={() => void signOut()} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-6">
          <Button className="mr-2 lg:hidden" variant="ghost" size="icon" aria-label="Abrir navegación" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="size-5" />
          </Button>
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Koi Software</span>
            <ChevronRight className="hidden size-3.5 sm:block" />
            <strong className="truncate font-medium text-foreground">{currentPage}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"><i className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_color-mix(in_oklch,#10b981_15%,transparent)]" /> Sistema operativo</span>
            <ModeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
