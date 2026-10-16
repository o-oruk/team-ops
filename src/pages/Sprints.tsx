import { useEffect, useState } from 'react'
import { useObjectives } from '../hooks/useObjectives'
import { useProfiles } from '../hooks/useProfiles'
import { useSprints } from '../hooks/useSprints'
import { useTasks } from '../hooks/useTasks'
import { Avatar } from '../components/layout/Avatar'
import { WeightBadge } from '../components/objectives/WeightBadge'
import { ProgressView } from '../components/progress/ProgressView'
import { objectiveTabStyle } from '../lib/color'
import { dateRange, todayISO } from '../lib/progress'
import type { Sprint, Task } from '../types'

function formatDay(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Done first (most recent first), then unfinished. */
function sortForArchive(a: Task, b: Task) {
  const aDone = a.status === 'done'
  const bDone = b.status === 'done'
  if (aDone !== bDone) return aDone ? -1 : 1
  return (b.completed_date ?? b.created_at).localeCompare(a.completed_date ?? a.created_at)
}

export function Sprints() {
  const { sprints, loading } = useSprints()
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null)

  useEffect(() => {
    if (!sprints.some((s) => s.id === activeSprintId)) setActiveSprintId(sprints[0]?.id ?? null)
  }, [sprints, activeSprintId])

  const sprint = sprints.find((s) => s.id === activeSprintId)

  if (loading) return null

  if (!sprint) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
        No archived sprints yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sprints.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {sprints.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSprintId(s.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                s.id === sprint.id ? 'bg-accent text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <SprintArchive key={sprint.id} sprint={sprint} />
    </div>
  )
}

function SprintArchive({ sprint }: { sprint: Sprint }) {
  const { tasks } = useTasks()
  const { objectives } = useObjectives()
  const { profiles } = useProfiles()
  const [section, setSection] = useState<'roadmap' | 'progress'>('roadmap')

  const sprintObjectives = objectives.filter((o) => o.sprint_id === sprint.id)
  const [activeObjectiveId, setActiveObjectiveId] = useState<string | null>(null)
  const activeObjective =
    sprintObjectives.find((o) => o.id === activeObjectiveId) ?? sprintObjectives[0] ?? null

  const objectiveIds = new Set(sprintObjectives.map((o) => o.id))
  const sprintTasks = tasks.filter((t) => objectiveIds.has(t.objective_id))
  const doneTasks = sprintTasks.filter((t) => t.status === 'done')
  const points = doneTasks.reduce((sum, t) => sum + t.weight, 0)
  const objectiveTasks = sprintTasks.filter((t) => t.objective_id === activeObjective?.id).sort(sortForArchive)

  const today = todayISO()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{sprint.name}</h1>
          <p className="text-sm text-slate-500">
            {formatDay(sprint.start_date)} → {formatDay(sprint.end_date)} · archived, read-only
          </p>
        </div>
        <div className="flex gap-6 text-right text-xs text-slate-500">
          <Stat value={sprintObjectives.length} label="objectives" />
          <Stat value={`${doneTasks.length}/${sprintTasks.length}`} label="tasks done" />
          <Stat value={points} label="points" />
        </div>
      </div>

      <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-sm w-fit">
        {(['roadmap', 'progress'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`rounded px-3 py-1 capitalize ${section === s ? 'bg-accent text-white' : 'text-slate-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {section === 'progress' ? (
        <ProgressView
          tasks={sprintTasks}
          objectives={objectives}
          dates={dateRange(sprint.start_date, sprint.end_date)}
          today={today}
          milestone={{ date: sprint.end_date, label: 'Seal the Deal' }}
          totalLabel="this sprint"
          showStreak={false}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            {sprintObjectives.map((obj) => {
              const isActive = obj.id === activeObjective?.id
              const count = sprintTasks.filter((t) => t.objective_id === obj.id).length
              return (
                <button
                  key={obj.id}
                  onClick={() => setActiveObjectiveId(obj.id)}
                  className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
                  style={objectiveTabStyle(obj.hue, isActive)}
                >
                  {obj.title}
                  <span className="ml-1.5 opacity-80">[{count}]</span>
                </button>
              )
            })}
          </div>

          {objectiveTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              No tasks under this objective.
            </div>
          ) : (
            <ul className="space-y-2">
              {objectiveTasks.map((task) => {
                const done = task.status === 'done'
                const assignees = profiles.filter((p) => task.assignee_ids.includes(p.id))
                return (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                        done ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                      }`}
                      aria-label={done ? 'Done' : 'Not finished'}
                    >
                      {done && '✓'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${done ? 'text-slate-800' : 'text-slate-500'}`}>{task.title}</p>
                      <p className="text-xs text-slate-400">
                        {done && task.completed_date ? `Done ${formatDay(task.completed_date)}` : 'Not finished'}
                      </p>
                    </div>
                    <WeightBadge weight={task.weight} />
                    <div className="flex -space-x-1.5">
                      {assignees.map((p) => (
                        <Avatar key={p.id} profile={p} size="sm" />
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
      <div>{label}</div>
    </div>
  )
}
