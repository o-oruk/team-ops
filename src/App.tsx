import { Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { PresenceProvider } from './hooks/usePresence'
import { ChatProvider } from './hooks/useChat'
import { AuthScreen } from './components/auth/AuthScreen'
import { ClaimProfile } from './components/auth/ClaimProfile'
import { ResetPasswordScreen } from './components/auth/ResetPasswordScreen'
import { AppShell } from './components/layout/AppShell'
import { Board } from './pages/Board'
import { Daily } from './pages/Daily'
import { Progress } from './pages/Progress'
import { Calendar } from './pages/Calendar'
import { Team } from './pages/Team'
import { Sprints } from './pages/Sprints'
import { Chat } from './pages/Chat'
import { MyProfile } from './pages/MyProfile'

function Gate() {
  const { session, profile, loading, isPasswordRecovery } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
        Loading…
      </div>
    )
  }

  if (isPasswordRecovery) return <ResetPasswordScreen />
  if (!session) return <AuthScreen />
  if (!profile?.claimed) return <ClaimProfile />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Board />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/team" element={<Team />} />
        <Route path="/sprints" element={<Sprints />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<MyProfile />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PresenceProvider>
        <ChatProvider>
          <Gate />
        </ChatProvider>
      </PresenceProvider>
    </AuthProvider>
  )
}
