import { useState } from 'react'
import { useObjectives } from '../hooks/useObjectives'
import { useProfiles } from '../hooks/useProfiles'
import { usePresence } from '../hooks/usePresence'
import { useTasks } from '../hooks/useTasks'
import { DayTasksModal } from '../components/progress/DayTasksModal'
import { Heatmap } from '../components/progress/Heatmap'
import { MemberCard } from '../components/progress/MemberCard'
import { PointsExplainer } from '../components/progress/PointsExplainer'
import { StreakFlame } from '../components/progress/StreakFlame'
import {
  SPRINT_START,
  SPRINT_END,
  STRONG_DAY_POINTS,
  currentStreak,
  dateRange,
  memberPointsByDate,
  tasksCompletedOn,
  teamPointsByDate,
  todayISO,
  totalPoints,
} from '../lib/progress'

export function Progress() {
  const { tasks } = useTasks()
  const { profiles } = useProfiles()
  const { objectives } = useObjectives()
  const presence = usePresence()
  const today = todayISO()
  const dates = dateRange(SPRINT_START, SPRINT_END)
  const teamPoints = teamPointsByDate(tasks)
  const teamTotal = totalPoints(teamPoints, dates)
  const teamStreak = currentStreak(teamPoints, dates, today, STRONG_DAY_POINTS)
  const claimedProfiles = profiles.filter((p) => p.claimed)

  const [selectedDay, setSelectedDay] = useState<{ date: string; memberId: string | null } | null>(
    null,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Progress tracker</h1>
        <p className="text-sm text-slate-500">
          Sprint window: {SPRINT_START} → {SPRINT_END} (pitch day)
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4">
        <StreakFlame streak={teamStreak} size={48} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{teamStreak}</span>
            <span className="text-sm font-semibold text-slate-700">day streak</span>
          </div>
          <p className="text-xs text-slate-500">Team needs {STRONG_DAY_POINTS}+ points a day to keep it going.</p>
        </div>
      </div>

      <PointsExplainer />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Team activity</h2>
          <span className="text-sm text-slate-500">{teamTotal} points this sprint</span>
        </div>
        <Heatmap
          dates={dates}
          pointsByDate={teamPoints}
          today={today}
          cellSize={13}
          onSelectDate={(date) => setSelectedDay({ date, memberId: null })}
        />
        <p className="mt-2 text-xs text-slate-400">
          Click any day to see what got done. The square ringed in purple is pitch day.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">By teammate</h2>
        {claimedProfiles.length === 0 ? (
          <p className="text-sm text-slate-500">No one has claimed a profile yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {claimedProfiles.map((profile) => (
              <MemberCard
                key={profile.id}
                profile={profile}
                dates={dates}
                pointsByDate={memberPointsByDate(tasks, profile.id)}
                today={today}
                presence={presence[profile.id] ?? 'offline'}
                onSelectDate={(date) => setSelectedDay({ date, memberId: profile.id })}
              />
            ))}
          </div>
        )}
      </div>

      {selectedDay && (
        <DayTasksModal
          date={selectedDay.date}
          tasks={tasksCompletedOn(tasks, selectedDay.date, selectedDay.memberId ?? undefined)}
          profiles={profiles}
          objectives={objectives}
          showAssignee={selectedDay.memberId === null}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
