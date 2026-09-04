import { useEffect, useState } from 'react'
import { getGoogleAccessToken } from '../lib/googleAuth'
import { deleteGoogleCalendarEvent, insertGoogleCalendarEvent, updateGoogleCalendarEvent } from '../lib/googleCalendar'
import { GOOGLE_CALENDAR_ID, isGoogleSyncConfigured } from '../lib/googleConfig'
import { supabase } from '../lib/supabase'
import type { ImportantDate } from '../types'

type SyncableFields = { title: string; date: string; time: string | null; end_time: string | null; note: string | null }

export function useImportantDates() {
  const [dates, setDates] = useState<ImportantDate[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('important_dates').select('*').order('date')
    setDates(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`important-dates-changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'important_dates' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /** Inserts if never synced, otherwise updates the existing Google event. Never throws. */
  async function pushToGoogle(id: string, existingGoogleEventId: string | null, fields: SyncableFields) {
    if (!isGoogleSyncConfigured()) return
    try {
      const token = await getGoogleAccessToken()
      if (existingGoogleEventId) {
        await updateGoogleCalendarEvent(token, GOOGLE_CALENDAR_ID!, existingGoogleEventId, fields)
      } else {
        const googleEventId = await insertGoogleCalendarEvent(token, GOOGLE_CALENDAR_ID!, fields)
        const { error } = await supabase.from('important_dates').update({ google_event_id: googleEventId }).eq('id', id)
        if (error) throw error
        await load()
      }
    } catch (err) {
      console.warn('Google Calendar sync failed:', err)
      throw err
    }
  }

  async function addDate(input: {
    title: string
    date: string
    time: string | null
    end_time: string | null
    type: ImportantDate['type']
    note: string | null
    createdBy: string
  }) {
    const { data, error } = await supabase
      .from('important_dates')
      .insert({
        title: input.title,
        date: input.date,
        time: input.time,
        end_time: input.end_time,
        type: input.type,
        note: input.note,
        created_by: input.createdBy,
      })
      .select('id')
      .single()
    if (error) throw error
    await load()
    await pushToGoogle(data.id, null, {
      title: input.title,
      date: input.date,
      time: input.time,
      end_time: input.end_time,
      note: input.note,
    }).catch(() => {})
  }

  async function updateDate(
    id: string,
    fields: Partial<Pick<ImportantDate, 'title' | 'date' | 'time' | 'end_time' | 'type' | 'note'>>,
  ) {
    const existing = dates.find((d) => d.id === id)
    const { error } = await supabase.from('important_dates').update(fields).eq('id', id)
    if (error) throw error
    await load()
    if (existing) {
      const merged = { ...existing, ...fields }
      await pushToGoogle(id, existing.google_event_id, {
        title: merged.title,
        date: merged.date,
        time: merged.time,
        end_time: merged.end_time,
        note: merged.note,
      }).catch(() => {})
    }
  }

  async function deleteDate(id: string) {
    const existing = dates.find((d) => d.id === id)
    const { error } = await supabase.from('important_dates').delete().eq('id', id)
    if (error) throw error
    await load()
    if (existing?.google_event_id && isGoogleSyncConfigured()) {
      try {
        const token = await getGoogleAccessToken()
        await deleteGoogleCalendarEvent(token, GOOGLE_CALENDAR_ID!, existing.google_event_id)
      } catch (err) {
        console.warn('Google Calendar delete sync failed:', err)
      }
    }
  }

  /** Manual retry/catch-all: (re)pushes one entry to Google Calendar. Throws on failure. */
  async function syncDateToGoogle(id: string) {
    const existing = dates.find((d) => d.id === id)
    if (!existing) return
    await pushToGoogle(id, existing.google_event_id, {
      title: existing.title,
      date: existing.date,
      time: existing.time,
      end_time: existing.end_time,
      note: existing.note,
    })
  }

  return { dates, loading, addDate, updateDate, deleteDate, syncDateToGoogle, refresh: load }
}
