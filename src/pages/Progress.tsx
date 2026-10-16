import { useObjectives } from '../hooks/useObjectives'
import { useTasks } from '../hooks/useTasks'
import { ProgressView } from '../components/progress/ProgressView'
import { currentQuarter, dateRange, todayISO } from '../lib/progress'

function formatDay(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function Progress() {
  const { tasks } = useTasks()
  const { objectives, activeObjectives } = useObjectives()
  const today = todayISO()
  const quarter = currentQuarter(today)
  const activeIds = new Set(activeObjectives.map((o) => o.id))
  const opsTasks = tasks.filter((t) => activeIds.has(t.objective_id))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Progress tracker</h1>
        <p className="text-sm text-slate-500">
          {quarter.label}: {formatDay(quarter.start)} → {formatDay(quarter.end)}. Sprint history lives under
          Sprints.
        </p>
      </div>
      <ProgressView
        tasks={opsTasks}
        objectives={objectives}
        dates={dateRange(quarter.start, quarter.end)}
        today={today}
        totalLabel="this quarter"
      />
    </div>
  )
}
