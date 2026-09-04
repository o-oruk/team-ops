import { useMemo, useState } from 'react'
import { formatTime, type AgendaEvent } from '../../lib/calendar'
import { isGoogleSyncConfigured } from '../../lib/googleConfig'
import { DATE_TYPE_COLOR } from '../../types'
import { GoogleCalendarIcon } from './GoogleCalendarIcon'

type Step = 'mode' | 'select' | 'syncing' | 'done'

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

function GoogleCalendarSyncModal({
  events,
  today,
  onSyncOne,
  onClose,
}: {
  events: AgendaEvent[]
  today: string
  onSyncOne: (id: string) => Promise<void>
  onClose: () => void
}) {
  const unsynced = useMemo(
    () =>
      events
        .filter((e) => e.date >= today && !e.google_event_id)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99')),
    [events, today],
  )

  const [step, setStep] = useState<Step>('mode')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState<AgendaEvent[]>([])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runSync(list: AgendaEvent[]) {
    setStep('syncing')
    setProgress(0)
    setTotal(list.length)
    const failures: AgendaEvent[] = []
    for (const event of list) {
      try {
        await onSyncOne(event.id)
      } catch {
        failures.push(event)
      }
      setProgress((p) => p + 1)
    }
    setFailed(failures)
    setStep('done')
  }

  function chooseAll() {
    void runSync(unsynced)
  }

  function chooseSpecific() {
    setSelectedIds(new Set())
    setStep('select')
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
              {unsynced.length} event{unsynced.length === 1 ? '' : 's'} not yet on the shared calendar.
            </p>
            <button
              onClick={chooseAll}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left hover:border-accent hover:bg-accent-light"
            >
              <span className="block text-sm font-medium text-slate-800">Add all</span>
              <span className="block text-xs text-slate-400">Push everything that's missing, in one go</span>
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
              {unsynced.map((event) => (
                <EventRow key={event.id} event={event} selected={selectedIds.has(event.id)} onToggle={() => toggle(event.id)} />
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => setStep('mode')} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
                Back
              </button>
              <button
                onClick={() => void runSync(unsynced.filter((e) => selectedIds.has(e.id)))}
                disabled={selectedIds.size === 0}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add ({selectedIds.size} selected)
              </button>
            </div>
          </div>
        )}

        {step === 'syncing' && (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-slate-500">
              Adding to Google Calendar… ({progress}/{total})
            </p>
            <p className="text-xs text-slate-400">If Google asks, sign in and approve calendar access.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-3">
            {failed.length === 0 ? (
              <p className="text-sm text-slate-600">All done — everything's on the shared calendar.</p>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Added {total - failed.length} of {total}, but {failed.length} failed:
                </p>
                <ul className="space-y-1 text-xs text-red-600">
                  {failed.map((e) => (
                    <li key={e.id}>{e.title}</li>
                  ))}
                </ul>
                <p className="text-xs text-slate-400">
                  These stay flagged as unsynced — try again from here, or from the event itself.
                </p>
              </>
            )}
            <div className="flex justify-end pt-1">
              <button
                onClick={onClose}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function GoogleCalendarSync({
  events,
  today,
  onSyncOne,
}: {
  events: AgendaEvent[]
  today: string
  onSyncOne: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  if (!isGoogleSyncConfigured()) return null
  const unsyncedCount = events.filter((e) => e.date >= today && !e.google_event_id).length
  if (unsyncedCount === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
      >
        <GoogleCalendarIcon className="h-5 w-5" />
        Sync to Google Calendar
        <span className="rounded-full bg-accent-light px-1.5 py-0.5 text-xs font-semibold text-accent">{unsyncedCount}</span>
      </button>
      {open && <GoogleCalendarSyncModal events={events} today={today} onSyncOne={onSyncOne} onClose={() => setOpen(false)} />}
    </>
  )
}
