import { AppProvider } from './app/AppContext'
import { AppShell } from './app/AppShell'
import type { ReactNode } from 'react'

export default function App({ welcomeControl }: { welcomeControl?: ReactNode } = {}) {
  return (
    <AppProvider>
      <AppShell welcomeControl={welcomeControl} />
    </AppProvider>
  )
}
