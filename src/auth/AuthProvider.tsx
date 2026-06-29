import type { Session, User } from '@supabase/supabase-js'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext, type TeamUser } from './auth-context'

async function getTeamUser(authUser: User): Promise<TeamUser> {
  const profileResponse = await supabase
    ?.from('profiles')
    .select('full_name, role')
    .eq('id', authUser.id)
    .single()

  return {
    id: authUser.id,
    email: authUser.email ?? '',
    fullName:
      profileResponse?.data?.full_name ??
      authUser.email?.split('@')[0] ??
      'Miembro del equipo',
    role: profileResponse?.data?.role === 'owner' ? 'owner' : 'member',
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<TeamUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      if (!supabase) {
        if (isMounted) setIsLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (isMounted && data.session?.user) {
        setUser(await getTeamUser(data.session.user))
      }
      if (isMounted) setIsLoading(false)
    }

    void restoreSession()

    const subscription = supabase?.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!isMounted) return
        if (!session?.user) {
          setUser(null)
          return
        }
        void getTeamUser(session.user).then((teamUser) => {
          if (isMounted) setUser(teamUser)
        })
      },
    )

    return () => {
      isMounted = false
      subscription?.data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase todavía no está configurado.')
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
