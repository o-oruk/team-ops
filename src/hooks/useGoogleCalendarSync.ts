import { useCallback, useEffect, useState } from 'react'
import {
  connectGoogleAccount,
  forgetGoogleAccount,
  getAccessTokenFor,
  listGoogleAccounts,
  readActiveGoogleAccount,
  writeActiveGoogleAccount,
  type GoogleAccount,
} from '../lib/googleAuth'
import type { AgendaEvent } from '../lib/calendar'
import {
  addEventsToCalendar,
  deleteGoogleCalendarEvent,
  ensureAmanaCalendar,
  putGoogleCalendarEvent,
  type AddOutcome,
  type SyncableEvent,
} from '../lib/googleCalendar'
import { isGoogleSyncConfigured } from '../lib/googleConfig'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface SyncSummary {
  added: number
  alreadyThere: number
  failed: { title: string; message: string }[]
}

interface LinkRow {
  important_date_id: string
  google_account_email: string
  google_calendar_id: string
}

function landed(outcome: AddOutcome): outcome is Extract<AddOutcome, { googleEventId: string }> {
  return outcome.status !== 'failed'
}

function toSyncable(event: AgendaEvent): SyncableEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    end_time: event.end_time,
    note: event.note,
    type: event.type,
  }
}

/**
 * Owns everything about pushing the calendar to Google: which accounts the user has connected,
 * which events have already landed in each one, and the one-click bulk add.
 *
 * "Already added" is tracked in `google_calendar_links` per Google account, so pressing the button
 * again only ever pushes entries created since the last press.
 */
export function useGoogleCalendarSync() {
  const { profile } = useAuth()
  const profileId = profile?.id ?? null

  const [accounts, setAccounts] = useState<GoogleAccount[]>(listGoogleAccounts)
  const [activeEmail, setActiveEmailState] = useState<string | null>(readActiveGoogleAccount)
  /** account email -> IDs of events already on that account's "Amana Vision" calendar. */
  const [linked, setLinked] = useState<Record<string, Set<string>>>({})

  const loadLinks = useCallback(async () => {
    if (!profileId) return
    // RLS already limits this to the signed-in user's own rows.
    const { data } = await supabase
      .from('google_calendar_links')
      .select('important_date_id, google_account_email, google_calendar_id')
    const next: Record<string, Set<string>> = {}
    for (const row of (data ?? []) as LinkRow[]) {
      ;(next[row.google_account_email] ??= new Set()).add(row.important_date_id)
    }
    setLinked(next)
  }, [profileId])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  /** Upcoming entries not yet on `email`'s calendar — exactly what a press of the button adds. */
  const pendingFor = useCallback(
    (email: string | null, events: AgendaEvent[], today: string) => {
      if (!email) return []
      const done = linked[email]
      return events
        .filter((e) => e.date >= today && !done?.has(e.id))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
    },
    [linked],
  )

  function setActiveEmail(email: string | null) {
    writeActiveGoogleAccount(email)
    setActiveEmailState(email)
  }

  /** Opens Google's account chooser. Call straight from a click — it opens a popup. */
  async function connectAccount(): Promise<GoogleAccount> {
    const account = await connectGoogleAccount()
    setAccounts(listGoogleAccounts())
    setActiveEmail(account.email)
    return account
  }

  function disconnectAccount(email: string) {
    const remaining = forgetGoogleAccount(email)
    setAccounts(remaining)
    setActiveEmailState(readActiveGoogleAccount())
  }

  /**
   * Adds every pending event to `email`'s "Amana Vision" calendar in one go.
   * `interactive` must be true when the call comes from a click that may show Google's sign-in.
   */
  async function addAllToGoogle(
    email: string,
    events: AgendaEvent[],
    today: string,
    { interactive, onProgress }: { interactive: boolean; onProgress?: (settled: number) => void },
  ): Promise<SyncSummary> {
    if (!profileId) throw new Error('You need to be signed in to the dashboard first')

    const pending = pendingFor(email, events, today)
    if (pending.length === 0) return { added: 0, alreadyThere: 0, failed: [] }

    const token = await getAccessTokenFor(email, { interactive })
    const calendarId = await ensureAmanaCalendar(token, email)
    const outcomes = await addEventsToCalendar(token, calendarId, pending.map(toSyncable), onProgress)

    const rows = outcomes.filter(landed).map((o) => ({
      important_date_id: o.id,
      linked_by: profileId,
      google_account_email: email,
      google_calendar_id: calendarId,
      google_event_id: o.googleEventId,
    }))
    if (rows.length > 0) {
      const { error } = await supabase
        .from('google_calendar_links')
        .upsert(rows, { onConflict: 'linked_by,important_date_id,google_account_email' })
      if (error) throw error
    }
    await loadLinks()

    const titleOf = new Map(pending.map((e) => [e.id, e.title]))
    return {
      added: outcomes.filter((o) => o.status === 'added').length,
      alreadyThere: outcomes.filter((o) => o.status === 'already-there').length,
      failed: outcomes
        .filter((o) => !landed(o))
        .map((o) => ({ title: titleOf.get(o.id) ?? 'Event', message: 'message' in o ? o.message : 'Failed' })),
    }
  }

  /** Every account this user has already pushed `importantDateId` to, with its calendar ID. */
  async function linksFor(importantDateId: string): Promise<LinkRow[]> {
    const { data } = await supabase
      .from('google_calendar_links')
      .select('important_date_id, google_account_email, google_calendar_id')
      .eq('important_date_id', importantDateId)
    return (data ?? []) as LinkRow[]
  }

  /**
   * Mirrors an edit onto the copies already in Google. Silent by design — nobody wants a Google
   * popup every time they rename an event — so when the token has lapsed this drops the link row
   * instead, which puts the event back in the button's count for the user to re-add on their terms.
   */
  async function pushEdit(event: AgendaEvent) {
    if (!isGoogleSyncConfigured()) return
    for (const link of await linksFor(event.id)) {
      try {
        const token = await getAccessTokenFor(link.google_account_email, { interactive: false })
        await putGoogleCalendarEvent(token, link.google_calendar_id, toSyncable(event))
      } catch (err) {
        console.warn('Could not update the Google copy of this event:', err)
        await supabase
          .from('google_calendar_links')
          .delete()
          .eq('important_date_id', event.id)
          .eq('google_account_email', link.google_account_email)
      }
    }
    await loadLinks()
  }

  /** Removes the Google copies. Call *before* deleting the row — the links cascade away with it. */
  async function pushDelete(importantDateId: string) {
    if (!isGoogleSyncConfigured()) return
    for (const link of await linksFor(importantDateId)) {
      try {
        const token = await getAccessTokenFor(link.google_account_email, { interactive: false })
        await deleteGoogleCalendarEvent(token, link.google_calendar_id, importantDateId)
      } catch (err) {
        console.warn('Could not remove the Google copy of this event:', err)
      }
    }
  }

  return {
    configured: isGoogleSyncConfigured(),
    accounts,
    activeEmail,
    setActiveEmail,
    connectAccount,
    disconnectAccount,
    pendingFor,
    addAllToGoogle,
    pushEdit,
    pushDelete,
  }
}

export type GoogleCalendarSyncApi = ReturnType<typeof useGoogleCalendarSync>
