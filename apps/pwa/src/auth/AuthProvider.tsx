import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, Store } from '../lib/roles'

interface AuthState {
  loading: boolean
  session: Session | null
  profile: Profile | null
  store: Store | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [store, setStore] = useState<Store | null>(null)

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null)
      setStore(null)
      return
    }
    const [p, st] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
      supabase.from('stores').select('*').eq('owner_id', s.user.id).maybeSingle(),
    ])
    setProfile((p.data as Profile) ?? null)
    setStore((st.data as Store) ?? null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await load(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      void load(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [load])

  const value: AuthState = {
    loading,
    session,
    profile,
    store,
    refresh: async () => load(session),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuera de AuthProvider')
  return v
}
