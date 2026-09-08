import { useEffect, useRef, useState } from 'react'
import type { GoogleCalendarSyncApi, SyncSummary } from '../../hooks/useGoogleCalendarSync'
import { formatTime, type AgendaEvent } from '../../lib/calendar'
import { AMANA_CALENDAR_NAME } from '../../lib/googleConfig'
import { DATE_TYPE_COLOR } from '../../types'
import { GoogleCalendarIcon } from './GoogleCalendarIcon'

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; settled: number; total: number }
  | { kind: 'done'; summary: SyncSummary }
  | { kind: 'error'; message: string }

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function initialsOf(account: { name: string | null; email: string }) {
  const source = account.name ?? account.email
  return source.slice(0, 1).toUpperCase()
}

function AccountRow({
  account,
  active,
  onSelect,
  onDisconnect,
}: {
  account: { email: string; name: string | null; picture: string | null }
  active: boolean
  onSelect: () => void
  onDisconnect: () => void
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors ${
        active ? 'border-accent bg-accent-light' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        {account.picture ? (
          <img src={account.picture} alt="" className="h-7 w-7 shrink-0 rounded-full" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {initialsOf(account)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          {account.name && <span className="block truncate text-sm font-medium text-slate-800">{account.name}</span>}
          <span className="block truncate text-xs text-slate-500">{account.email}</span>
        </span>
        {active && (
          <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 fill-accent" aria-hidden="true">
            <path d="M6.5 11.5 3 8l1-1 2.5 2.5L12 4l1 1z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={onDisconnect}
        title={`Forget ${account.email}`}
        className="rounded-md px-1.5 py-1 text-xs text-slate-300 hover:bg-white hover:text-slate-600"
      >
        ✕
      </button>
    </div>
  )
}

function Panel({
  sync,
  pending,
  phase,
  onRun,
  onConnect,
  onClose,
}: {
  sync: GoogleCalendarSyncApi
  pending: AgendaEvent[]
  phase: Phase
  onRun: () => void
  onConnect: () => void
  onClose: () => void
}) {
  const busy = phase.kind === 'working'

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Add to Google Calendar</p>
          <p className="text-xs text-slate-400">Everything lands in a "{AMANA_CALENDAR_NAME}" calendar.</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
          ✕
        </button>
      </div>

      <div className="space-y-1.5">
        {sync.accounts.map((account) => (
          <AccountRow
            key={account.email}
            account={account}
            active={account.email === sync.activeEmail}
            onSelect={() => sync.setActiveEmail(account.email)}
            onDisconnect={() => sync.disconnectAccount(account.email)}
          />
        ))}
        <button
          type="button"
          onClick={onConnect}
          className="w-full rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-xs text-slate-500 hover:border-accent hover:text-accent"
        >
          {sync.accounts.length === 0 ? '+ Connect a Google account' : '+ Use another Google account'}
        </button>
      </div>

      {sync.activeEmail && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {pending.length === 0 ? (
            <p className="text-xs text-slate-400">
              Every upcoming event is already on this account's calendar. New ones will show up here.
            </p>
          ) : (
            <>
              <p className="mb-1.5 text-xs font-medium text-slate-500">
                {pending.length} event{pending.length === 1 ? '' : 's'} to add
              </p>
              <ul className="max-h-44 space-y-1 overflow-y-auto">
                {pending.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-md bg-slate-50 px-2 py-1.5"
                    style={{ borderLeft: `3px solid ${DATE_TYPE_COLOR[event.type]}` }}
                  >
                    <span className="block truncate text-xs font-medium text-slate-700">{event.title}</span>
                    <span className="block text-[11px] text-slate-400">
                      {formatDate(event.date)}
                      {event.time && ` · ${formatTime(event.time)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <button
            onClick={onRun}
            disabled={busy || pending.length === 0}
            className="mt-2.5 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? `Adding… ${phase.settled}/${phase.total}` : `Add ${pending.length} event${pending.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {phase.kind === 'error' && <p className="mt-2 text-xs text-red-600">{phase.message}</p>}

      {phase.kind === 'done' && phase.summary.failed.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-red-600">{phase.summary.failed.length} couldn't be added:</p>
          <ul className="max-h-24 space-y-0.5 overflow-y-auto text-[11px] text-red-500">
            {phase.summary.failed.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.title}</span> — {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function GoogleCalendarSync({
  sync,
  events,
  today,
}: {
  sync: GoogleCalendarSyncApi
  events: AgendaEvent[]
  today: string
}) {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Let a clean "Added N…" result fade back to the normal label rather than sitting there forever.
  useEffect(() => {
    if (phase.kind !== 'done' || phase.summary.failed.length > 0) return
    const timer = setTimeout(() => setPhase({ kind: 'idle' }), 4000)
    return () => clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (!sync.configured) return null

  const pending = sync.pendingFor(sync.activeEmail, events, today)

  async function run() {
    const email = sync.activeEmail
    if (!email) {
      setOpen(true)
      return
    }
    const total = sync.pendingFor(email, events, today).length
    if (total === 0) {
      setPhase({ kind: 'done', summary: { added: 0, alreadyThere: 0, failed: [] } })
      return
    }

    setPhase({ kind: 'working', settled: 0, total })
    try {
      const summary = await sync.addAllToGoogle(email, events, today, {
        // Called straight from a click, so Google's sign-in popup is allowed if it's needed.
        interactive: true,
        onProgress: (settled) => setPhase({ kind: 'working', settled, total }),
      })
      setPhase({ kind: 'done', summary })
      setOpen(summary.failed.length > 0)
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Something went wrong' })
      setOpen(true)
    }
  }

  async function connect() {
    setPhase({ kind: 'idle' })
    try {
      await sync.connectAccount()
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Could not connect that account' })
    }
  }

  const working = phase.kind === 'working'
  const label = working
    ? `Adding… ${phase.settled}/${phase.total}`
    : phase.kind === 'done' && phase.summary.failed.length === 0
      ? phase.summary.added > 0
        ? `Added ${phase.summary.added} to ${AMANA_CALENDAR_NAME}`
        : 'Everything is already there'
      : 'Add to Google Calendar'

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md">
        <button
          onClick={() => void run()}
          disabled={working}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-wait"
        >
          <GoogleCalendarIcon className="h-5 w-5" />
          {label}
          {!working && pending.length > 0 && (
            <span className="rounded-full bg-accent-light px-1.5 py-0.5 text-xs font-semibold text-accent">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Choose Google account"
          aria-expanded={open}
          className="border-l border-slate-200 px-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current" aria-hidden="true">
            <path d="M8 11 3 5.5 4 4.5 8 8.8l4-4.3 1 1z" />
          </svg>
        </button>
      </div>

      {open && (
        <Panel
          sync={sync}
          pending={pending}
          phase={phase}
          onRun={() => void run()}
          onConnect={() => void connect()}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
