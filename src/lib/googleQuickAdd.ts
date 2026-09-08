import { addOneHourCapped } from './calendar'

export interface QuickAddEvent {
  title: string
  date: string
  time: string | null
  end_time: string | null
  note: string | null
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, '')
}

/** "14:30" or "14:30:00" -> "143000" — tolerates either, since Postgres round-trips with seconds. */
function compactTime(time: string): string {
  const withSeconds = time.length === 5 ? `${time}:00` : time
  return withSeconds.replace(/:/g, '')
}

function compactDateTime(iso: string, time: string): string {
  return `${compactDate(iso)}T${compactTime(time)}`
}

/** Google's all-day `dates` range is start-inclusive/end-exclusive, so a single day needs date+1. */
function nextDayCompact(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return compactDate(d.toLocaleDateString('en-CA'))
}

/**
 * Builds a Google Calendar "quick add" link for one event — opens calendar.google.com pre-filled,
 * where the person picks whichever of their own Google accounts they want and clicks Save.
 *
 * Deliberately not the Calendar API: no OAuth client, no consent screen, nothing stored, and it
 * works for any Google account without the dashboard ever knowing which ones exist. The trade-off
 * is that this link format has no parameter for event color — Google doesn't expose one — so the
 * category color has to be set by hand afterward with one click on the event's color swatch.
 */
export function googleQuickAddUrl(event: QuickAddEvent): string {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title })
  if (event.note) params.set('details', event.note)

  if (event.time) {
    const endTime = event.end_time ?? addOneHourCapped(event.time)
    params.set('dates', `${compactDateTime(event.date, event.time)}/${compactDateTime(event.date, endTime)}`)
    params.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone)
  } else {
    params.set('dates', `${compactDate(event.date)}/${nextDayCompact(event.date)}`)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
