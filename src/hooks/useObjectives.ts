import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nextDistinctHue } from '../lib/color'
import type { Objective } from '../types'

export function useObjectives() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('objectives').select('*').order('position')
    setObjectives(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`objectives-changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Objectives archived into a finished sprint live on the Sprints page, not the Roadmap.
  const activeObjectives = objectives.filter((o) => !o.sprint_id)

  async function addObjective(title: string) {
    const position = objectives.length
    const hue = nextDistinctHue(activeObjectives.map((o) => o.hue))
    const { error } = await supabase.from('objectives').insert({ title, position, hue })
    if (error) throw error
    await load()
  }

  async function renameObjective(id: string, title: string) {
    const { error } = await supabase.from('objectives').update({ title }).eq('id', id)
    if (error) throw error
    await load()
  }

  async function deleteObjective(id: string) {
    const { error } = await supabase.from('objectives').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  return { objectives, activeObjectives, loading, addObjective, renameObjective, deleteObjective, refresh: load }
}
