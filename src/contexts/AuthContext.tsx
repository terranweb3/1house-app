import React, { useCallback, useEffect, useMemo, useState } from "react"

import { supabase } from "@/lib/supabase"
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContextValue"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthContextValue["session"]>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!isMounted) return
        if (error) throw error
        setSession(data.session ?? null)
      } catch {
        if (!isMounted) return
        setSession(null)
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    []
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signInWithPassword,
      signOut,
    }),
    [session, isLoading, signInWithPassword, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

