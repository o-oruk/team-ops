import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useObjectives } from '../hooks/useObjectives'
import { usePresence } from '../hooks/usePresence'
import { useProfiles } from '../hooks/useProfiles'
import { useTasks, todayISO } from '../hooks/useTasks'
import { joinNames } from '../lib/progress'
import { Avatar } from '../components/layout/Avatar'
import { DailyTaskCard } from '../components/daily/DailyTaskCard'
import type { Task } from '../types'

export function Daily() {
  const { profile } = useAuth()
  const { tasks, completeTask, returnToBacklog } = useTasks()
  const { profiles } = useProfiles()
  const { objectives } = useObjectives()
  const presence = usePresence()
  const [view, setView] = useState<'team' | 'mine'>('team')

  const today = todayISO()
  const manualDaily = tasks.filter((t) => t.status === 'daily')
  const autoDue = tasks.filter((t) => t.status === 'backlog' && !!t.due_date && t.due_date <= today)
  const combined = [...manualDaily, ...autoDue]
  const referenceDate = (t: Task) => (t.status === 'daily' ? t.scheduled_date : t.due_date)
  const dueToday = combined.filter((t) => referenceDate(t) === today)
  const overdue = combined.filter((t) => {
    const ref = referenceDate(t)
    return !!ref && ref < today
  })
  const completedToday = tasks.filter((t) => t.status === 'done' && t.completed_date === today)
  const pending = [...overdue, ...dueToday]

  const visible =
    view === 'mine'
      ? [...pending, ...completedToday].filter((t) => !!profile && t.assignee_ids.includes(profile.id))
      : [...pending, ...completedToday]

  const groups = new Map<string, Task[]>()
  for (const task of visible) {
    const keys = task.assignee_ids.length > 0 ? task.assignee_ids : ['unassigned']
    for (const key of keys) {
      groups.set(key, [...(groups.get(key) ?? []), task])
    }
  }

  const orderedGroupEntries = [...groups.entries()].sort(([a], [b]) => {
    if (profile) {
      if (a === profile.id) return -1
      if (b === profile.id) return 1
    }
    return 0
  })

  function objectiveFor(task: Task) {
    return objectives.find((o) => o.id === task.objective_id)
  }

  function canRemoveFromToday(task: Task) {
    return task.status === 'daily' && (!task.due_date || task.due_date > today)
  }

  function canComplete(task: Task) {
    return task.assignee_ids.length === 0 || (!!profile && task.assignee_ids.includes(profile.id))
  }

  function completedByLabel(task: Task) {
    const names = profiles.filter((p) => task.assignee_ids.includes(p.id)).map((p) => p.name)
    if (names.length > 0) return joinNames(names)
    return profiles.find((p) => p.id === task.completed_by)?.name
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Today's list</h1>
        <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-sm">
          <button
            onClick={() => setView('mine')}
            className={`rounded px-3 py-1 ${view === 'mine' ? 'bg-accent text-white' : 'text-slate-600'}`}
          >
            Mine
          </button>
          <button
            onClick={() => setView('team')}
            className={`rounded px-3 py-1 ${view === 'team' ? 'bg-accent text-white' : 'text-slate-600'}`}
          >
            Team
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {view === 'mine'
            ? "Nothing on your list today. Push a task to today's list from the Roadmap."
            : "Nothing on the team's list today. Push tasks in from the Roadmap."}
        </div>
      ) : view === 'mine' ? (
        <ul className="space-y-2">
          {visible.map((task) => (
            <DailyTaskCard
              key={task.id}
              task={task}
              objective={objectiveFor(task)}
              today={today}
              canComplete={canComplete(task)}
              completedByLabel={completedByLabel(task)}
              onComplete={() => (profile ? completeTask(task.id, profile.id) : Promise.resolve())}
              onReturnToBacklog={canRemoveFromToday(task) ? () => returnToBacklog(task.id) : undefined}
            />
          ))}
        </ul>
      ) : (
        <div className="space-y-6">
          {orderedGroupEntries.map(([assigneeId, groupTasks]) => {
            const groupProfile = profiles.find((p) => p.id === assigneeId)
            return (
              <div key={assigneeId}>
                <div className="mb-2 flex items-center gap-2">
                  <Avatar profile={groupProfile} size="sm" status={groupProfile ? (presence[groupProfile.id] ?? 'offline') : undefined} />
                  <span className="text-sm font-medium text-slate-700">
                    {groupProfile?.name ?? 'Unassigned'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {groupTasks.length} task{groupTasks.length === 1 ? '' : 's'}
                  </span>
                </div>
                <ul className="space-y-2">
                  {groupTasks.map((task) => (
                    <DailyTaskCard
                      key={task.id}
                      task={task}
                      objective={objectiveFor(task)}
                      today={today}
                      canComplete={canComplete(task)}
                      completedByLabel={completedByLabel(task)}
                      onComplete={() => (profile ? completeTask(task.id, profile.id) : Promise.resolve())}
                      onReturnToBacklog={canRemoveFromToday(task) ? () => returnToBacklog(task.id) : undefined}
                    />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {overdue.length > 0 && (
        <p className="text-xs text-slate-400">
          {overdue.length} task{overdue.length === 1 ? '' : 's'} carried over from a previous day are
          included above.
        </p>
      )}
    </div>
  )
}
