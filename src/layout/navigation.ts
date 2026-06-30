import {
  CalendarDays,
  CircleDollarSign,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Users,
} from 'lucide-react'

export const navigation = [
  { label: 'Resumen', to: '/', icon: LayoutDashboard, ownerOnly: false },
  { label: 'Clientes', to: '/clientes', icon: Users, ownerOnly: false },
  { label: 'Proyectos', to: '/proyectos', icon: FolderKanban, ownerOnly: false },
  { label: 'Finanzas', to: '/finanzas', icon: CircleDollarSign, ownerOnly: true },
  { label: 'Calendario', to: '/calendario', icon: CalendarDays, ownerOnly: false },
  { label: 'Credenciales', to: '/credenciales', icon: KeyRound, ownerOnly: true },
] as const
