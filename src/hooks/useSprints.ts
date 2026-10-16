import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Sprint } from '../types'

export function useSprints() {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    // Errors (e.g. the sprints table not existing yet) just mean "no sprints".
    const { data } = await supabase.from('sprints').select('*').order('start_date', { ascending: false })
    setSprints(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`sprints-changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { sprints, loading, refresh: load }
}
