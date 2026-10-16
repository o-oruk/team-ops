import type { Objective, Profile, Task } from '../../types'
import { isUrgentDue } from '../../lib/dueDate'
import { textOnWhite } from '../../lib/color'
import { DueBadge } from '../objectives/DueBadge'
import { WeightBadge } from '../objectives/WeightBadge'

export function DailyTaskCard({
  task,
  objective,
  today,
  canComplete,
  completedByLabel,
  onComplete,
  onReturnToBacklog,
  sharedWith = [],
  viewerId,
}: {
  task: Task
  objective: Objective | undefined
  today: string
  canComplete: boolean
  completedByLabel?: string
  onComplete: () => Promise<void>
  onReturnToBacklog?: () => Promise<void>
  /** The task's other assignees, besides the person whose list this card is on. */
  sharedWith?: Profile[]
  viewerId?: string
}) {
  const isDone = task.status === 'done'
  const isOverdue = !isDone && !!task.due_date && task.due_date < today
  // Colored by the teammate(s) you share it with, not by whoever's list it's on.
  const sharedPeople = [...sharedWith].sort((a, b) => (a.id === viewerId ? -1 : b.id === viewerId ? 1 : 0))

  return (
    <li
      className={`relative flex items-center gap-3 overflow-hidden rounded-lg border px-4 py-3 ${
        isOverdue && !isDone ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
      }`}
    >
      {sharedPeople.length > 0 && (
        <div aria-hidden="true" className={`absolute inset-y-0 left-0 flex w-1 flex-col ${isDone ? 'opacity-40' : ''}`}>
          {sharedPeople.map((p) => (
            <div key={p.id} className="flex-1" style={{ backgroundColor: p.color }} />
          ))}
        </div>
      )}
      <input
        type="checkbox"
        checked={isDone}
        disabled={isDone || !canComplete}
        onChange={() => void onComplete()}
        title={isDone ? undefined : canComplete ? undefined : "Only this task's assignee can mark it done"}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={isDone ? 'Completed' : 'Mark done'}
      />
      <div className="min-w-[140px] flex-1">
        {isDone ? (
          <p className="text-sm text-slate-400 line-through">{task.title}</p>
        ) : (
          <p className="text-sm text-slate-800">{task.title}</p>
        )}
        {isDone && completedByLabel ? (
          <p className="text-xs text-slate-400">Completed by {completedByLabel}</p>
        ) : (
          (objective || sharedPeople.length > 0) && (
            <p className="text-xs text-slate-400">
              {objective?.title}
              {objective && sharedPeople.length > 0 && ' · '}
              {sharedPeople.length > 0 && (
                <span title="One shared task, not separate copies. Checking it off completes it for everyone.">
                  Shared with{' '}
                  {sharedPeople.map((p, idx) => (
                    <span key={p.id}>
                      {idx > 0 && (idx === sharedPeople.length - 1 ? ' & ' : ', ')}
                      <span className="font-semibold" style={{ color: textOnWhite(p.color) }}>
                        {p.id === viewerId ? 'you' : p.name}
                      </span>
                    </span>
                  ))}
                </span>
              )}
            </p>
          )
        )}
      </div>
      <WeightBadge weight={task.weight} />
      {!isDone && task.due_date && (
        <DueBadge dueDate={task.due_date} today={today} isUrgent={isUrgentDue(task.due_date, false, today)} />
      )}
      {!isDone &&
        (onReturnToBacklog ? (
          <button
            onClick={() => void onReturnToBacklog()}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800"
          >
            Remove from today's list
          </button>
        ) : (
          <span
            title="This task showed up automatically because it's due"
            className="rounded-full bg-accent-light px-2 py-1 text-xs font-medium text-accent"
          >
            Due
          </span>
        ))}
    </li>
  )
}
