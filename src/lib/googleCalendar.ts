const RECENT_EMAILS_KEY = 'gcal_recent_emails'
const MAX_RECENT_EMAILS = 5

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function formatLocal(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

function formatDateOnly(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/**
 * Builds a Google Calendar "quick add" link prefilled with the event's title, date/time, and
 * note. Timed events use the event's own end time, falling back to a 1-hour duration if none is
 * set. `authuserEmail`, if given, targets that Google account when it's already signed into the
 * browser; otherwise Google falls back to its normal account picker.
 */
export function googleCalendarUrl(
  event: { title: string; date: string; time: string | null; end_time?: string | null; note: string | null },
  authuserEmail?: string,
): string {
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title })
  if (event.note) params.set('details', event.note)

  if (event.time) {
    const start = new Date(`${event.date}T${event.time}`)
    const end = event.end_time
      ? new Date(`${event.date}T${event.end_time}`)
      : new Date(start.getTime() + 60 * 60 * 1000)
    params.set('dates', `${formatLocal(start)}/${formatLocal(end)}`)
    params.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone)
  } else {
    const start = new Date(`${event.date}T00:00:00`)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    params.set('dates', `${formatDateOnly(start)}/${formatDateOnly(end)}`)
  }

  const url = `https://calendar.google.com/calendar/render?${params.toString()}`
  return authuserEmail ? `${url}&authuser=${encodeURIComponent(authuserEmail)}` : url
}

/** Emails previously used with "Add to Google Calendar", most recent first. Per-browser only. */
export function getRecentGoogleEmails(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_EMAILS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function rememberGoogleEmail(email: string) {
  try {
    const trimmed = email.trim()
    if (!trimmed) return
    const updated = [trimmed, ...getRecentGoogleEmails().filter((e) => e !== trimmed)].slice(0, MAX_RECENT_EMAILS)
    localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable (private browsing, etc.) — not critical
  }
}
