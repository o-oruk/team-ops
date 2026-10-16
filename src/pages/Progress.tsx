import { useObjectives } from '../hooks/useObjectives'
import { useTasks } from '../hooks/useTasks'
import { ProgressView } from '../components/progress/ProgressView'
import { OPS_START, opsDateRange, todayISO } from '../lib/progress'

export function Progress() {
  const { tasks } = useTasks()
  const { objectives, activeObjectives } = useObjectives()
  const today = todayISO()
  const activeIds = new Set(activeObjectives.map((o) => o.id))
  const opsTasks = tasks.filter((t) => activeIds.has(t.objective_id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Progress tracker</h1>
        <p className="text-sm text-slate-500">
          Ongoing operations, last 6 months. Sprint history lives under Sprints.
        </p>
      </div>
      <ProgressView
        tasks={opsTasks}
        objectives={objectives}
        dates={opsDateRange(today)}
        today={today}
        trackingStart={OPS_START}
        totalLabel="in the last 6 months"
      />
    </div>
  )
}
