import type { Objective, Task } from '../../types'
import { isUrgentDue } from '../../lib/dueDate'
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
}: {
  task: Task
  objective: Objective | undefined
  today: string
  canComplete: boolean
  completedByLabel?: string
  onComplete: () => Promise<void>
  onReturnToBacklog?: () => Promise<void>
}) {
  const isDone = task.status === 'done'
  const isOverdue = !isDone && !!task.due_date && task.due_date < today

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isOverdue && !isDone ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
      }`}
    >
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
    </li>
  )
}
