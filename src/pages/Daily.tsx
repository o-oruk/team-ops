import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useObjectives } from '../hooks/useObjectives'
import { usePresence } from '../hooks/usePresence'
import { useProfiles } from '../hooks/useProfiles'
import { useTasks, todayISO } from '../hooks/useTasks'
import { joinNames } from '../lib/progress'
import { addDaysISO } from '../lib/dueDate'
import { byManualOrder } from '../lib/taskOrder'
import { Avatar } from '../components/layout/Avatar'
import { DailyTaskCard } from '../components/daily/DailyTaskCard'
import type { Task } from '../types'

function dayHeading(day: string, today: string) {
  if (day === today) return "Today's list"
  if (day === addDaysISO(today, 1)) return 'Tomorrow'
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function shortDay(day: string, today: string) {
  if (day === addDaysISO(today, 1)) return 'tomorrow'
  return new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000)

export function Daily() {
  const { profile } = useAuth()
  const { tasks: allTasks, completeTask, returnToBacklog } = useTasks()
  const { profiles } = useProfiles()
  const { objectives, activeObjectives } = useObjectives()
  const presence = usePresence()
  const [view, setView] = useState<'team' | 'mine'>('team')
  // 0 = today; the arrows step forward through upcoming days to preview what's due.
  const [dayOffset, setDayOffset] = useState(0)

  const today = todayISO()
  const viewDay = addDaysISO(today, dayOffset)
  const isToday = dayOffset === 0
  // Unfinished tasks from an archived sprint don't carry over into day-to-day ops.
  const activeIds = new Set(activeObjectives.map((o) => o.id))
  const tasks = allTasks.filter((t) => activeIds.has(t.objective_id))
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
  // Order by actual closeness to deadline (due_date), not by when a task was pushed to today's
  // list — a task pushed early for a later due date should sort after ones truly due sooner.
  // Same deadline: grouped by objective, then in the order they were dragged into on the Roadmap.
  const deadlineKey = (t: Task) => t.due_date ?? referenceDate(t) ?? ''
  const objectivePosition = (t: Task) => objectives.find((o) => o.id === t.objective_id)?.position ?? 0
  const byDeadline = (a: Task, b: Task) => {
    const ak = deadlineKey(a)
    const bk = deadlineKey(b)
    if (ak !== bk) return ak < bk ? -1 : 1
    if (a.objective_id !== b.objective_id) return objectivePosition(a) - objectivePosition(b)
    return byManualOrder(a, b)
  }
  const pending = [...overdue, ...dueToday].sort(byDeadline)

  const isMine = (t: Task) => view === 'team' || (!!profile && t.assignee_ids.includes(profile.id))
  // Upcoming = still in the backlog with a future deadline. Tasks already pushed onto today's list
  // stay there rather than also appearing on their due day.
  const upcoming = tasks.filter((t) => t.status === 'backlog' && !!t.due_date && t.due_date > today && isMine(t))
  const visible = isToday
    ? [...pending, ...completedToday].filter(isMine)
    : upcoming.filter((t) => t.due_date === viewDay).sort(byDeadline)
  const nextDayWithTasks = upcoming
    .map((t) => t.due_date!)
    .filter((d) => d > viewDay)
    .sort()[0]

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

  /** The task's other assignees, besides the person whose list it's showing on. */
  function sharedWith(task: Task, listOwnerId: string | undefined) {
    return profiles.filter((p) => task.assignee_ids.includes(p.id) && p.id !== listOwnerId)
  }

  function completedByLabel(task: Task) {
    const names = profiles.filter((p) => task.assignee_ids.includes(p.id)).map((p) => p.name)
    if (names.length > 0) return joinNames(names)
    return profiles.find((p) => p.id === task.completed_by)?.name
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDayOffset((d) => Math.max(0, d - 1))}
            disabled={isToday}
            aria-label="Previous day"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:invisible"
          >
            ‹
          </button>
          <h1 className="min-w-[9.5rem] text-center text-lg font-semibold text-slate-900">
            {dayHeading(viewDay, today)}
          </h1>
          <button
            onClick={() => setDayOffset((d) => d + 1)}
            aria-label="Next day"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800"
          >
            ›
          </button>
          {!isToday && (
            <button
              onClick={() => setDayOffset(0)}
              className="ml-1 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent-light"
            >
              Back to today
            </button>
          )}
        </div>
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
          <p>
            {isToday
              ? view === 'mine'
                ? "Nothing on your list today. Push a task to today's list from the Roadmap."
                : "Nothing on the team's list today. Push tasks in from the Roadmap."
              : `Nothing ${view === 'mine' ? 'of yours ' : ''}due ${shortDay(viewDay, today)}.`}
          </p>
          {nextDayWithTasks && (
            <button
              onClick={() => setDayOffset(daysBetween(today, nextDayWithTasks))}
              className="mt-3 rounded-md bg-accent-light px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
            >
              Next up: {shortDay(nextDayWithTasks, today)} →
            </button>
          )}
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
              isUpcoming={!isToday}
              sharedWith={sharedWith(task, profile?.id)}
              viewerId={profile?.id}
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
                      isUpcoming={!isToday}
                      sharedWith={assigneeId === 'unassigned' ? [] : sharedWith(task, assigneeId)}
                      viewerId={profile?.id}
                    />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {isToday && overdue.length > 0 && (
        <p className="text-xs text-slate-400">
          {overdue.length} task{overdue.length === 1 ? '' : 's'} carried over from a previous day are
          included above.
        </p>
      )}
    </div>
  )
}
