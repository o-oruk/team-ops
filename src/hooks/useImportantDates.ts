import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ImportantDate } from '../types'

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

  async function addDate(input: {
    title: string
    date: string
    time: string | null
    end_time: string | null
    type: ImportantDate['type']
    note: string | null
    createdBy: string
  }) {
    const { error } = await supabase.from('important_dates').insert({
      title: input.title,
      date: input.date,
      time: input.time,
      end_time: input.end_time,
      type: input.type,
      note: input.note,
      created_by: input.createdBy,
    })
    if (error) throw error
    await load()
  }

  async function updateDate(
    id: string,
    fields: Partial<Pick<ImportantDate, 'title' | 'date' | 'time' | 'end_time' | 'type' | 'note'>>,
  ) {
    const { error } = await supabase.from('important_dates').update(fields).eq('id', id)
    if (error) throw error
    await load()
  }

  async function deleteDate(id: string) {
    const { error } = await supabase.from('important_dates').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { dates, loading, addDate, updateDate, deleteDate, refresh: load }
}
