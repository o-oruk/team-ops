import { addOneHourCapped, toISODate } from './calendar'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

export interface SyncableEvent {
  title: string
  date: string
  time: string | null
  end_time: string | null
  note: string | null
}

function buildEventResource(event: SyncableEvent) {
  if (event.time) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const endTime = event.end_time ?? addOneHourCapped(event.time)
    return {
      summary: event.title,
      description: event.note ?? undefined,
      start: { dateTime: `${event.date}T${event.time}:00`, timeZone },
      end: { dateTime: `${event.date}T${endTime}:00`, timeZone },
    }
  }
  const start = new Date(`${event.date}T00:00:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return {
    summary: event.title,
    description: event.note ?? undefined,
    start: { date: event.date },
    end: { date: toISODate(end) },
  }
}

async function calendarRequest(path: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  return res
}

/** Inserts an event into the given calendar, returning its Google event ID. */
export async function insertGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: SyncableEvent,
): Promise<string> {
  const res = await calendarRequest(`/calendars/${encodeURIComponent(calendarId)}/events`, accessToken, {
    method: 'POST',
    body: JSON.stringify(buildEventResource(event)),
  })
  if (!res.ok) throw new Error(`Google Calendar insert failed (${res.status})`)
  const data = await res.json()
  return data.id as string
}

/** Updates an existing Google Calendar event to match the dashboard's current fields. */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
  event: SyncableEvent,
): Promise<void> {
  const res = await calendarRequest(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    accessToken,
    { method: 'PATCH', body: JSON.stringify(buildEventResource(event)) },
  )
  if (!res.ok) throw new Error(`Google Calendar update failed (${res.status})`)
}

/** Deletes a Google Calendar event. Already-gone events (404/410) are treated as success. */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  googleEventId: string,
): Promise<void> {
  const res = await calendarRequest(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
    accessToken,
    { method: 'DELETE' },
  )
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar delete failed (${res.status})`)
  }
}
