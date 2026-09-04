import { useEffect, useId, useRef, useState } from 'react'
import type { AgendaEvent } from '../../lib/calendar'
import { getRecentGoogleEmails, googleCalendarUrl, rememberGoogleEmail } from '../../lib/googleCalendar'

export function AddToGoogleCalendarButton({ event }: { event: AgendaEvent }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const datalistId = useId()

  useEffect(() => {
    if (!open) return
    const remembered = getRecentGoogleEmails()
    setRecent(remembered)
    setEmail(remembered[0] ?? '')
  }, [open])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function go() {
    const trimmed = email.trim()
    if (trimmed) rememberGoogleEmail(trimmed)
    window.open(googleCalendarUrl(event, trimmed || undefined), '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        title="Add to Google Calendar"
      >
        Add to Google
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-medium text-slate-600">Add to which Google account?</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            list={datalistId}
            placeholder="you@gmail.com"
            autoFocus
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
          />
          <datalist id={datalistId}>
            {recent.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={go}
              className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90"
            >
              Open in Google Calendar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
