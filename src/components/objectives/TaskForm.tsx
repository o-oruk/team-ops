import { useState, type FormEvent } from 'react'
import type { Profile, TaskWeight } from '../../types'
import { todayISO } from '../../hooks/useTasks'
import { DatePicker } from '../shared/DatePicker'
import { AssigneePicker } from './AssigneePicker'
import { WeightPicker } from './WeightPicker'

export function TaskForm({
  profiles,
  onSubmit,
}: {
  profiles: Profile[]
  onSubmit: (input: {
    title: string
    weight: TaskWeight
    assigneeIds: string[]
    dueDate: string
  }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [weight, setWeight] = useState<TaskWeight | null>(null)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const titleMissing = showErrors && !title.trim()
  const weightMissing = showErrors && weight === null
  const dueDateMissing = showErrors && !dueDate

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || weight === null || !dueDate) {
      setShowErrors(true)
      return
    }
    setBusy(true)
    try {
      await onSubmit({ title: title.trim(), weight, assigneeIds, dueDate })
      setTitle('')
      setWeight(null)
      setAssigneeIds([])
      setDueDate('')
      setShowErrors(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-start gap-2 rounded-lg border border-dashed border-slate-300 p-3"
    >
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className={`w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 ${
            titleMissing
              ? 'border-red-400 focus-visible:ring-red-400'
              : 'border-slate-300 focus-visible:ring-accent'
          }`}
        />
        {titleMissing && <span className="text-xs text-red-500">Title is required</span>}
      </div>

      <div className="flex flex-col gap-1">
        <WeightPicker value={weight} onChange={setWeight} invalid={weightMissing} />
        {weightMissing && <span className="text-xs text-red-500">Pick a size</span>}
      </div>

      <AssigneePicker
        profiles={profiles}
        selectedIds={assigneeIds}
        onApply={(added, removed) =>
          setAssigneeIds((ids) => [...ids.filter((id) => !removed.includes(id)), ...added])
        }
      />

      <div className="flex flex-col gap-1">
        <DatePicker
          value={dueDate}
          onChange={setDueDate}
          placeholder="Deadline"
          invalid={dueDateMissing}
          minDate={todayISO()}
          confirmSelection
        />
        {dueDateMissing && <span className="text-xs text-red-500">Pick a deadline</span>}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
      >
        Add task
      </button>
    </form>
  )
}
