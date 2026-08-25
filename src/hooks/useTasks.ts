import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { playTaskCompleteSound } from '../lib/sound'
import type { Task, TaskWeight } from '../types'

function todayISO() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

type TaskRow = Omit<Task, 'assignee_ids'> & { task_assignees: { profile_id: string }[] }

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('tasks')
      .select('*, task_assignees(profile_id)')
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as TaskRow[]
    setTasks(
      rows.map(({ task_assignees, ...task }) => ({
        ...task,
        assignee_ids: task_assignees.map((a) => a.profile_id),
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`tasks-changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function addTask(input: {
    objectiveId: string
    title: string
    weight: TaskWeight
    assigneeIds: string[]
    dueDate: string | null
    createdBy: string
  }) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        objective_id: input.objectiveId,
        title: input.title,
        weight: input.weight,
        due_date: input.dueDate,
        created_by: input.createdBy,
      })
      .select('id')
      .single()
    if (error) throw error
    if (input.assigneeIds.length > 0) {
      const { error: assigneeError } = await supabase
        .from('task_assignees')
        .insert(input.assigneeIds.map((profileId) => ({ task_id: data.id, profile_id: profileId })))
      if (assigneeError) throw assigneeError
    }
    await load()
  }

  async function updateTask(id: string, fields: Partial<Pick<Task, 'title' | 'weight' | 'due_date'>>) {
    const { error } = await supabase.from('tasks').update(fields).eq('id', id)
    if (error) throw error
    await load()
  }

  async function toggleAssignee(taskId: string, profileId: string, assign: boolean) {
    if (assign) {
      const { error } = await supabase.from('task_assignees').insert({ task_id: taskId, profile_id: profileId })
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('profile_id', profileId)
      if (error) throw error
    }
    await load()
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    await load()
  }

  async function pushToDaily(id: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'daily', scheduled_date: todayISO() })
      .eq('id', id)
    if (error) throw error
    await load()
  }

  async function returnToBacklog(id: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'backlog', scheduled_date: null })
      .eq('id', id)
    if (error) throw error
    await load()
  }

  async function completeTask(id: string, completedBy: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_by: completedBy, completed_date: todayISO() })
      .eq('id', id)
    if (error) throw error
    playTaskCompleteSound()
    await load()
  }

  async function updateCompletedDate(id: string, date: string) {
    const { error } = await supabase.from('tasks').update({ completed_date: date }).eq('id', id)
    if (error) throw error
    await load()
  }

  async function reopenTask(task: Task) {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: task.scheduled_date ? 'daily' : 'backlog',
        completed_by: null,
        completed_date: null,
      })
      .eq('id', task.id)
    if (error) throw error
    await load()
  }

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    toggleAssignee,
    deleteTask,
    pushToDaily,
    returnToBacklog,
    completeTask,
    updateCompletedDate,
    reopenTask,
    refresh: load,
  }
}

export { todayISO }
