import { createContext, useContext } from 'react'

export type TeamRole = 'owner' | 'member'

export interface TeamUser {
  id: string
  email: string
  fullName: string
  role: TeamRole
}

export interface AuthContextValue {
  user: TeamUser | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
