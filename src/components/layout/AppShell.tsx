import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { usePresence } from '../../hooks/usePresence'
import { useProfiles } from '../../hooks/useProfiles'
import { useChat } from '../../hooks/useChat'
import { Avatar } from './Avatar'
import { Countdown } from './Countdown'
import { ExportDataButton } from './ExportDataButton'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { to: '/', label: 'Roadmap', end: true },
  { to: '/daily', label: 'Tasks' },
  { to: '/progress', label: 'Progress' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/team', label: 'Team' },
  { to: '/chat', label: 'Chat' },
]

const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1CpxMWZJKCWwBrp-Dipca6WqA6oUYRsYk?usp=sharing'

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const presence = usePresence()
  const { profiles } = useProfiles()
  const { unreadCount } = useChat()
  const teammates = profiles.filter((p) => p.claimed && p.id !== profile?.id)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10">
        <Countdown />
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Logo size={24} />
                Team Ops
              </span>
              <nav className="flex gap-1">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent-light text-accent'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {item.label}
                    {item.to === '/chat' && unreadCount > 0 && (
                      <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </NavLink>
                ))}
                <a
                  href={DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Files
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                    <path
                      d="M4 2h6v6M10 2L2 10"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <ExportDataButton />
              <div className="h-5 w-px bg-slate-200" />
              {teammates.length > 0 && (
                <>
                  <div className="flex -space-x-1.5">
                    {teammates.map((p, i) => (
                      <span key={p.id} className="relative" style={{ zIndex: teammates.length - i }}>
                        <Avatar profile={p} size="sm" status={presence[p.id] ?? 'offline'} />
                      </span>
                    ))}
                  </div>
                  <div className="h-5 w-px bg-slate-200" />
                </>
              )}
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors ${
                    isActive ? 'bg-accent-light' : 'hover:bg-slate-100'
                  }`
                }
              >
                <Avatar profile={profile} size="sm" status={profile ? (presence[profile.id] ?? 'offline') : undefined} />
                <span className="hidden text-sm text-slate-600 sm:inline">{profile?.name}</span>
              </NavLink>
              <button
                onClick={signOut}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                Log out
              </button>
            </div>
          </div>
        </header>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
