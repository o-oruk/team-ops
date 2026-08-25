import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useObjectives } from '../hooks/useObjectives'
import { useProfiles } from '../hooks/useProfiles'
import { useTasks } from '../hooks/useTasks'
import { ObjectiveTabs } from '../components/objectives/ObjectiveTabs'
import { TaskForm } from '../components/objectives/TaskForm'
import { TaskRow } from '../components/objectives/TaskRow'

export function Board() {
  const { profile } = useAuth()
  const { objectives, addObjective, renameObjective, deleteObjective } = useObjectives()
  const { profiles } = useProfiles()
  const { tasks, addTask, updateTask, toggleAssignee, deleteTask, pushToDaily, reopenTask, updateCompletedDate } =
    useTasks()
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeId && objectives.length > 0) setActiveId(objectives[0].id)
    if (activeId && !objectives.some((o) => o.id === activeId)) {
      setActiveId(objectives[0]?.id ?? null)
    }
  }, [objectives, activeId])

  const activeTasks = tasks
    .filter((t) => t.objective_id === activeId)
    .sort((a, b) => {
      const aDone = a.status === 'done'
      const bDone = b.status === 'done'
      if (aDone !== bDone) return aDone ? 1 : -1

      if (!aDone) {
        // Pending tasks: earliest deadline first, undated tasks fall to the end of this group.
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date) return -1
        if (b.due_date) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      // Completed tasks: most recently completed first.
      const aCompleted = a.completed_date ?? a.created_at
      const bCompleted = b.completed_date ?? b.created_at
      return new Date(bCompleted).getTime() - new Date(aCompleted).getTime()
    })

  const pendingCounts: Record<string, number> = {}
  for (const task of tasks) {
    if (task.status === 'done') continue
    pendingCounts[task.objective_id] = (pendingCounts[task.objective_id] ?? 0) + 1
  }

  async function handleDeleteObjective(id: string) {
    const count = tasks.filter((t) => t.objective_id === id).length
    const objTitle = objectives.find((o) => o.id === id)?.title ?? 'this objective'
    const message =
      count > 0
        ? `Delete "${objTitle}"? This will also permanently delete its ${count} task${count === 1 ? '' : 's'}.`
        : `Delete "${objTitle}"?`
    if (confirm(message)) await deleteObjective(id)
  }

  const isAdmin = profile?.role === 'admin'

  if (objectives.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-600">
          {isAdmin ? 'No objectives yet. Add your first one to get started.' : 'No objectives yet.'}
        </p>
        <div className="mt-4 flex justify-center">
          <ObjectiveTabs
            objectives={[]}
            activeId={null}
            pendingCounts={pendingCounts}
            onSelect={() => {}}
            onAdd={addObjective}
            onRename={renameObjective}
            onDelete={handleDeleteObjective}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ObjectiveTabs
        objectives={objectives}
        activeId={activeId}
        pendingCounts={pendingCounts}
        onSelect={setActiveId}
        onAdd={addObjective}
        onRename={renameObjective}
        onDelete={handleDeleteObjective}
        isAdmin={isAdmin}
      />

      {profile && (
        <TaskForm
          profiles={profiles}
          onSubmit={async ({ title, weight, assigneeIds, dueDate }) => {
            if (!activeId) return
            await addTask({
              objectiveId: activeId,
              title,
              weight,
              assigneeIds,
              dueDate,
              createdBy: profile.id,
            })
          }}
        />
      )}

      {activeTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          This bucket is empty. Add a task above to start building the roadmap for this objective.
        </div>
      ) : (
        <ul className="space-y-2">
          {activeTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              profiles={profiles}
              onUpdate={(fields) => updateTask(task.id, fields)}
              onToggleAssignee={(profileId, assign) => void toggleAssignee(task.id, profileId, assign)}
              onDelete={() => deleteTask(task.id)}
              onPushToDaily={() => pushToDaily(task.id)}
              onReopen={() => reopenTask(task)}
              onUpdateCompletedDate={(date) => updateCompletedDate(task.id, date)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
