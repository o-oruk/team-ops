import type { Objective, Profile, Task } from '../../types'
import { isUrgentDue } from '../../lib/dueDate'
import { joinNames } from '../../lib/progress'
import { Avatar } from '../layout/Avatar'
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
  const isShared = sharedWith.length > 0
  // The viewer goes first, as "you".
  const sharedPeople = [...sharedWith].sort((a, b) => (a.id === viewerId ? -1 : b.id === viewerId ? 1 : 0))
  const sharedNames = sharedPeople.map((p) => (p.id === viewerId ? 'you' : p.name))

  return (
    <li
      className={`overflow-hidden rounded-lg border ${
        isOverdue && !isDone ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
      } ${isShared ? 'border-l-4 !border-l-violet-500' : ''}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
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
          {isShared && (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              👥 Shared task
            </span>
          )}
          {isDone ? (
            <p className="text-sm text-slate-400 line-through">{task.title}</p>
          ) : (
            <p className="text-sm text-slate-800">{task.title}</p>
          )}
          {isDone && completedByLabel ? (
            <p className="text-xs text-slate-400">Completed by {completedByLabel}</p>
          ) : (
            objective && <p className="text-xs text-slate-400">{objective.title}</p>
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
      </div>
      {isShared && (
        <div
          className={`flex items-center gap-2 border-t px-4 py-2 text-xs ${
            isDone ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-violet-100 bg-violet-50 text-violet-900'
          }`}
        >
          <div className="flex shrink-0 -space-x-1.5">
            {sharedPeople.map((p) => (
              <Avatar key={p.id} profile={p} size="sm" />
            ))}
          </div>
          {isDone ? (
            <p>Shared with {joinNames(sharedNames)}. Done for everyone.</p>
          ) : (
            <p>
              <span className="font-semibold">Shared with {joinNames(sharedNames)}.</span> This is one task, not
              separate copies. Agree who's doing what before you start. Checking it off completes it for
              everyone.
            </p>
          )}
        </div>
      )}
    </li>
  )
}
