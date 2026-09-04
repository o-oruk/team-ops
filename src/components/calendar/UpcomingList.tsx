import { daysLeftLabel, formatTimeRange, type AgendaEvent } from '../../lib/calendar'
import { DATE_TYPE_COLOR } from '../../types'

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function UpcomingList({
  events,
  today,
  onJumpTo,
}: {
  events: AgendaEvent[]
  today: string
  onJumpTo: (date: string) => void
}) {
  const upcoming = events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl border-2 border-accent/30 bg-accent-light px-5 py-4">
        <h2 className="text-sm font-semibold text-accent">Upcoming</h2>
        <p className="mt-1 text-sm text-slate-500">
          Nothing upcoming yet — create an entry below to see it here.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 border-accent/30 bg-accent-light px-5 py-4">
      <h2 className="mb-3 text-sm font-semibold text-accent">Upcoming</h2>
      <div className="flex flex-wrap gap-3">
        {upcoming.map((event) => {
          const color = DATE_TYPE_COLOR[event.type]
          return (
            <button
              key={event.id}
              onClick={() => onJumpTo(event.date)}
              className="flex w-[160px] shrink-0 flex-col gap-1 rounded-lg border border-accent/20 bg-white px-3 py-2.5 text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderLeft: `5px solid ${color}` }}
            >
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                {formatDate(event.date)}
                {event.time && ` · ${formatTimeRange(event.time, event.end_time)}`}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{daysLeftLabel(event.date, today)}</span>
              <span className="truncate text-sm font-medium text-slate-800">{event.title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
