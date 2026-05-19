import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nome, avatar_url, role, ativo, departamento_id, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) return
    setProfile(data ?? null)
  }

  useEffect(() => {
    let cancelled = false

    // Failsafe: se `getSession()` travar (rede caída, token corrompido,
    // etc.) liberamos o app em vez de deixar a tela do Spinner para
    // sempre. 3 segundos é suficiente; em rede normal `getSession`
    // retorna em < 200 ms.
    const failSafe = setTimeout(() => {
      if (!cancelled) {
        console.warn('[AuthContext] getSession demorou > 3s — liberando app sem sessão.')
        setLoading(false)
      }
    }, 3000)

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) void fetchProfile(session.user.id)
      } catch (err) {
        console.error('[AuthContext] getSession falhou:', err)
      } finally {
        if (!cancelled) {
          clearTimeout(failSafe)
          setLoading(false)
        }
      }
    }

    void init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) void fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => {
      cancelled = true
      clearTimeout(failSafe)
      subscription.unsubscribe()
    }
  }, [])

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
