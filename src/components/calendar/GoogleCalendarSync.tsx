import { useId, useMemo, useState } from 'react'
import { formatTime, type AgendaEvent } from '../../lib/calendar'
import { getRecentGoogleEmails, googleCalendarUrl, rememberGoogleEmail } from '../../lib/googleCalendar'
import { DATE_TYPE_COLOR } from '../../types'
import { GoogleCalendarIcon } from './GoogleCalendarIcon'

type Step = 'mode' | 'select' | 'account'

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function EventRow({ event, selected, onToggle }: { event: AgendaEvent; selected: boolean; onToggle: () => void }) {
  const color = DATE_TYPE_COLOR[event.type]
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all"
      style={{ borderLeftWidth: 5, borderLeftColor: selected ? color : `${color}33` }}
    >
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-medium transition-colors"
          style={{ color: selected ? '#1e293b' : '#94a3b8' }}
        >
          {event.title}
        </span>
        <span className="block text-xs transition-colors" style={{ color: selected ? color : '#cbd5e1' }}>
          {formatDate(event.date)}
          {event.time && ` · ${formatTime(event.time)}`}
        </span>
      </span>
      {selected && (
        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" style={{ fill: color }} aria-hidden="true">
          <path d="M6.5 11.5 3 8l1-1 2.5 2.5L12 4l1 1z" />
        </svg>
      )}
    </button>
  )
}

function GoogleCalendarSyncModal({ events, today, onClose }: { events: AgendaEvent[]; today: string; onClose: () => void }) {
  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99')),
    [events, today],
  )

  const [step, setStep] = useState<Step>('mode')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [email, setEmail] = useState(() => getRecentGoogleEmails()[0] ?? '')
  const recentEmails = useMemo(() => getRecentGoogleEmails(), [])
  const datalistId = useId()

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedEvents = upcoming.filter((e) => selectedIds.has(e.id))

  function chooseAll() {
    setSelectedIds(new Set(upcoming.map((e) => e.id)))
    setStep('account')
  }

  function chooseSpecific() {
    setSelectedIds(new Set())
    setStep('select')
  }

  function addToCalendar() {
    const trimmed = email.trim()
    if (trimmed) rememberGoogleEmail(trimmed)
    for (const event of selectedEvents) {
      window.open(googleCalendarUrl(event, trimmed || undefined), '_blank', 'noopener,noreferrer')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <GoogleCalendarIcon className="h-5 w-5" />
            Sync to Google Calendar
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ✕
          </button>
        </div>

        {step === 'mode' && (
          <div className="space-y-2">
            <p className="mb-3 text-sm text-slate-500">
              {upcoming.length} upcoming event{upcoming.length === 1 ? '' : 's'} on the calendar.
            </p>
            <button
              onClick={chooseAll}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-accent hover:bg-accent-light"
            >
              <span className="block text-sm font-medium text-slate-800">Add all events</span>
              <span className="block text-xs text-slate-400">Push every upcoming event at once</span>
            </button>
            <button
              onClick={chooseSpecific}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-accent hover:bg-accent-light"
            >
              <span className="block text-sm font-medium text-slate-800">Choose specific events</span>
              <span className="block text-xs text-slate-400">Pick which ones to add</span>
            </button>
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-3">
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {upcoming.map((event) => (
                <EventRow key={event.id} event={event} selected={selectedIds.has(event.id)} onToggle={() => toggle(event.id)} />
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep('mode')} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
                Back
              </button>
              <button
                onClick={() => setStep('account')}
                disabled={selectedIds.size === 0}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next ({selectedIds.size} selected)
              </button>
            </div>
          </div>
        )}

        {step === 'account' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Adding <span className="font-medium text-slate-700">{selectedEvents.length}</span> event
              {selectedEvents.length === 1 ? '' : 's'} to Google Calendar.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Which Google account?</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToCalendar()}
                list={datalistId}
                placeholder="you@gmail.com"
                autoFocus
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-accent"
              />
              <datalist id={datalistId}>
                {recentEmails.map((e) => (
                  <option key={e} value={e} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-slate-400">
                Opens {selectedEvents.length > 1 ? 'a tab per event, each' : 'a tab'} pre-filled for this account — if it's
                not signed in, Google will ask you to pick one.
              </p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setStep(selectedEvents.length === upcoming.length ? 'mode' : 'select')}
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                Back
              </button>
              <button
                onClick={addToCalendar}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
              >
                Add to Google Calendar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function GoogleCalendarSync({ events, today }: { events: AgendaEvent[]; today: string }) {
  const [open, setOpen] = useState(false)
  const hasUpcoming = events.some((e) => e.date >= today)

  if (!hasUpcoming) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
      >
        <GoogleCalendarIcon className="h-5 w-5" />
        Sync to Google Calendar
      </button>
      {open && <GoogleCalendarSyncModal events={events} today={today} onClose={() => setOpen(false)} />}
    </>
  )
}
