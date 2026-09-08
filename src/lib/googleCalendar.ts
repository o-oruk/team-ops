import { addOneHourCapped, toISODate } from './calendar'
import { AMANA_CALENDAR_COLOR, AMANA_CALENDAR_DESCRIPTION, AMANA_CALENDAR_NAME } from './googleConfig'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'
/** How many event writes are in flight at once. Enough to feel instant, gentle on Google's quota. */
const CONCURRENCY = 8

export interface SyncableEvent {
  /** The `important_dates` row ID — also what the Google event ID is derived from. */
  id: string
  title: string
  date: string
  time: string | null
  end_time: string | null
  note: string | null
}

export type AddOutcome =
  | { id: string; status: 'added' | 'already-there'; googleEventId: string }
  | { id: string; status: 'failed'; message: string }

/**
 * Turns a dashboard row ID into the Google event ID it always gets.
 *
 * Google accepts a caller-chosen event ID as long as it's base32hex (`0-9a-v`, 5–1024 chars), and
 * a UUID's hex digits already qualify. Deriving the ID rather than remembering one is what makes
 * adding an event twice physically impossible: the second insert hits Google's own uniqueness
 * check and comes back 409 instead of creating a duplicate — even if our bookkeeping were lost.
 */
export function googleEventIdFor(importantDateId: string): string {
  return `amanavision${importantDateId.replace(/-/g, '').toLowerCase()}`
}

function buildEventResource(event: SyncableEvent) {
  const shared = {
    summary: event.title,
    description: event.note ?? undefined,
    status: 'confirmed',
  }
  if (event.time) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const endTime = event.end_time ?? addOneHourCapped(event.time)
    return {
      ...shared,
      start: { dateTime: `${event.date}T${event.time}:00`, timeZone },
      end: { dateTime: `${event.date}T${endTime}:00`, timeZone },
    }
  }
  const start = new Date(`${event.date}T00:00:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { ...shared, start: { date: event.date }, end: { date: toISODate(end) } }
}

async function calendarRequest(path: string, accessToken: string, init?: RequestInit) {
  return fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init?.headers },
  })
}

async function errorMessage(res: Response, what: string): Promise<string> {
  try {
    const body = await res.json()
    if (body?.error?.message) return `${what}: ${body.error.message}`
  } catch {
    // Non-JSON error body — the status code is all we have.
  }
  return `${what} (${res.status})`
}

// ─────────────────────────────────────────────────────────────
// The "Amana Vision" calendar
// ─────────────────────────────────────────────────────────────

/** Resolved calendar IDs, keyed by account email. Saves a lookup round-trip on repeat syncs. */
const calendarIdByAccount = new Map<string, string>()

interface CalendarListEntry {
  id: string
  summary?: string
  summaryOverride?: string
}

async function findAmanaCalendar(accessToken: string): Promise<string | null> {
  const target = AMANA_CALENDAR_NAME.toLowerCase()
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ maxResults: '250', minAccessRole: 'writer', showHidden: 'true' })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await calendarRequest(`/users/me/calendarList?${params}`, accessToken)
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not list your Google calendars'))
    const data = await res.json()
    const match = (data.items as CalendarListEntry[] | undefined)?.find((c) =>
      [c.summary, c.summaryOverride].some((name) => name?.trim().toLowerCase() === target),
    )
    if (match) return match.id
    pageToken = data.nextPageToken as string | undefined
  } while (pageToken)
  return null
}

async function createAmanaCalendar(accessToken: string): Promise<string> {
  const res = await calendarRequest('/calendars', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      summary: AMANA_CALENDAR_NAME,
      description: AMANA_CALENDAR_DESCRIPTION,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, `Could not create the "${AMANA_CALENDAR_NAME}" calendar`))
  const id = (await res.json()).id as string

  // Give it the dashboard's accent colour in Google's sidebar. Purely cosmetic, so failure is fine.
  await calendarRequest(`/users/me/calendarList/${encodeURIComponent(id)}?colorRgbFormat=true`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ backgroundColor: AMANA_CALENDAR_COLOR, foregroundColor: '#ffffff', selected: true }),
  }).catch(() => {})

  return id
}

/**
 * Finds this account's "Amana Vision" calendar, creating it the first time. Every dashboard event
 * lands here rather than in the user's main calendar, so it can be toggled off in one click.
 */
export async function ensureAmanaCalendar(accessToken: string, accountEmail: string): Promise<string> {
  const cached = calendarIdByAccount.get(accountEmail)
  if (cached) return cached
  const id = (await findAmanaCalendar(accessToken)) ?? (await createAmanaCalendar(accessToken))
  calendarIdByAccount.set(accountEmail, id)
  return id
}

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────

function eventPath(calendarId: string, googleEventId?: string) {
  const base = `/calendars/${encodeURIComponent(calendarId)}/events`
  return googleEventId ? `${base}/${encodeURIComponent(googleEventId)}` : base
}

/** Overwrites an event with the dashboard's current fields (and revives it if it was deleted). */
export async function putGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: SyncableEvent,
): Promise<void> {
  const googleEventId = googleEventIdFor(event.id)
  const res = await calendarRequest(eventPath(calendarId, googleEventId), accessToken, {
    method: 'PUT',
    body: JSON.stringify({ ...buildEventResource(event), id: googleEventId }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Google Calendar update failed'))
}

/** Deletes an event. Already-gone events (404/410) count as success. */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  importantDateId: string,
): Promise<void> {
  const res = await calendarRequest(eventPath(calendarId, googleEventIdFor(importantDateId)), accessToken, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(await errorMessage(res, 'Google Calendar delete failed'))
  }
}

async function addOne(accessToken: string, calendarId: string, event: SyncableEvent): Promise<AddOutcome> {
  const googleEventId = googleEventIdFor(event.id)
  try {
    const res = await calendarRequest(eventPath(calendarId), accessToken, {
      method: 'POST',
      body: JSON.stringify({ ...buildEventResource(event), id: googleEventId }),
    })
    if (res.ok) return { id: event.id, status: 'added', googleEventId }
    if (res.status === 409) {
      // Google already has this exact event ID. Writing the current fields over it both confirms
      // the match and repairs anything that drifted (an edit that never reached Google, or the
      // event having been deleted there), which is why this counts as success rather than an error.
      await putGoogleCalendarEvent(accessToken, calendarId, event)
      return { id: event.id, status: 'already-there', googleEventId }
    }
    return { id: event.id, status: 'failed', message: await errorMessage(res, 'Google rejected this event') }
  } catch (err) {
    return { id: event.id, status: 'failed', message: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Pushes every given event to the calendar at once — not one at a time, and never a duplicate.
 * Resolves only when all of them have settled; individual failures come back in the results
 * rather than aborting the rest.
 */
export async function addEventsToCalendar(
  accessToken: string,
  calendarId: string,
  events: SyncableEvent[],
  onProgress?: (settled: number) => void,
): Promise<AddOutcome[]> {
  const outcomes = new Array<AddOutcome>(events.length)
  let nextIndex = 0
  let settled = 0

  const workers = Array.from({ length: Math.min(CONCURRENCY, events.length) }, async () => {
    for (let i = nextIndex++; i < events.length; i = nextIndex++) {
      outcomes[i] = await addOne(accessToken, calendarId, events[i])
      onProgress?.(++settled)
    }
  })
  await Promise.all(workers)

  return outcomes
}
