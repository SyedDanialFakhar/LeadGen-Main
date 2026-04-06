// src/hooks/useAuth.ts
import { useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      setIsLoading(false)
      return error ? error.message : null
    },
    []
  )

  const signUp = useCallback(
    async (email: string, password: string, name: string): Promise<string | null> => {
      setIsLoading(true)
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })
      setIsLoading(false)
      
      if (error) {
        return error.message
      }
      
      // If user was created successfully, you might want to add them to a profiles table
      if (data.user) {
        // Optional: Add user to a profiles table
        // await supabase.from('profiles').insert({ id: data.user.id, name })
      }
      
      return null
    },
    []
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  }
}