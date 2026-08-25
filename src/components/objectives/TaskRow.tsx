import { useState } from 'react'
import type { Profile, Task } from '../../types'
import { DatePicker } from '../shared/DatePicker'
import { Avatar } from '../layout/Avatar'
import { AssigneePicker } from './AssigneePicker'
import { DueBadge } from './DueBadge'
import { WeightBadge } from './WeightBadge'
import { WeightPicker } from './WeightPicker'
import { todayISO } from '../../hooks/useTasks'
import { isUrgentDue } from '../../lib/dueDate'
import { joinNames } from '../../lib/progress'

const STATUS_LABEL: Record<Task['status'], string> = {
  backlog: 'Backlog',
  daily: "On today's list",
  done: 'Done',
}

export function TaskRow({
  task,
  profiles,
  onUpdate,
  onToggleAssignee,
  onDelete,
  onPushToDaily,
  onReopen,
  onUpdateCompletedDate,
}: {
  task: Task
  profiles: Profile[]
  onUpdate: (fields: Partial<Pick<Task, 'title' | 'weight' | 'due_date'>>) => Promise<void>
  onToggleAssignee: (profileId: string, assign: boolean) => void
  onDelete: () => Promise<void>
  onPushToDaily: () => Promise<void>
  onReopen: () => Promise<void>
  onUpdateCompletedDate: (date: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [editingCompletedDate, setEditingCompletedDate] = useState(false)
  const today = todayISO()
  const isDone = task.status === 'done'
  const isUrgent = isUrgentDue(task.due_date, isDone, today)
  const isOverdue = !isDone && !!task.due_date && task.due_date < today
  const assignees = profiles.filter((p) => task.assignee_ids.includes(p.id))
  const isAutoToday = task.status === 'backlog' && !!task.due_date && task.due_date <= today
  const fallbackCompleter = profiles.find((p) => p.id === task.completed_by)
  const completers = assignees.length > 0 ? assignees : fallbackCompleter ? [fallbackCompleter] : []

  async function saveTitle() {
    setEditing(false)
    const trimmed = title.trim()
    if (trimmed && trimmed !== task.title) await onUpdate({ title: trimmed })
    else setTitle(task.title)
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 ${
        isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="min-w-[160px] flex-1">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
          />
        ) : isDone ? (
          <span className="text-sm text-slate-400 line-through">{task.title}</span>
        ) : (
          <button onClick={() => setEditing(true)} className="text-left text-sm text-slate-800">
            {task.title}
          </button>
        )}
        {isDone && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-400">
            {completers.length > 0 && <span>Completed by {joinNames(completers.map((p) => p.name))} on</span>}
            {editingCompletedDate ? (
              <DatePicker
                value={task.completed_date ?? today}
                onChange={(date) => {
                  if (date) void onUpdateCompletedDate(date)
                  setEditingCompletedDate(false)
                }}
                maxDate={today}
                triggerClassName="!px-1.5 !py-0.5 !text-xs"
              />
            ) : (
              <button
                onClick={() => setEditingCompletedDate(true)}
                title="Fix the completion date"
                className="underline decoration-dotted underline-offset-2 hover:text-slate-600"
              >
                {task.completed_date
                  ? new Date(task.completed_date + 'T00:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'unknown date'}
              </button>
            )}
            <button
              onClick={() => void onReopen()}
              className="ml-2 font-medium text-red-500 underline hover:text-red-700"
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {isDone ? (
        <WeightBadge weight={task.weight} />
      ) : (
        <WeightPicker value={task.weight} onChange={(weight) => onUpdate({ weight })} />
      )}

      <div className="flex items-center gap-1.5">
        {isDone ? (
          task.due_date && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              Was due{' '}
              {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )
        ) : (
          <>
            <DatePicker
              value={task.due_date ?? ''}
              onChange={(date) => onUpdate({ due_date: date || null })}
              placeholder="Deadline"
              clearable
              minDate={today}
              confirmSelection
            />
            {task.due_date && <DueBadge dueDate={task.due_date} today={today} isUrgent={isUrgent} />}
          </>
        )}
      </div>

      {isDone ? (
        assignees.length === 0 ? (
          <Avatar profile={undefined} size="sm" />
        ) : (
          <div className="flex -space-x-1.5">
            {assignees.map((p) => (
              <Avatar key={p.id} profile={p} size="sm" />
            ))}
          </div>
        )
      ) : (
        <AssigneePicker profiles={profiles} selectedIds={task.assignee_ids} onToggle={onToggleAssignee} />
      )}

      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
        {isAutoToday ? "On today's list" : STATUS_LABEL[task.status]}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {task.status === 'backlog' && !isAutoToday && (
          <button
            onClick={onPushToDaily}
            className="rounded-md bg-accent-light px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20"
          >
            Push to today
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`Delete "${task.title}"? This can't be undone.`)) void onDelete()
          }}
          className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-red-50 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </li>
  )
}
