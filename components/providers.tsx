'use client'
// App-wide client providers. FRONTEND agent mounts <Providers> in app/layout.tsx
// so the whole tree can call useSession() / signIn() / signOut().
import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
