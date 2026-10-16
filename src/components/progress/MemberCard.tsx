import type { Profile } from '../../types'
import type { PresenceStatus } from '../../hooks/usePresence'
import { Avatar } from '../layout/Avatar'
import { Heatmap } from './Heatmap'
import { activeDayRate, currentStreak, totalPoints } from '../../lib/progress'

export function MemberCard({
  profile,
  dates,
  pointsByDate,
  today,
  presence,
  trackingStart,
  milestone,
  onSelectDate,
}: {
  profile: Profile
  dates: string[]
  pointsByDate: Map<string, number>
  today: string
  presence?: PresenceStatus
  /** Days before this (or before the person joined, whichever is later) aren't counted. */
  trackingStart?: string
  milestone?: { date: string; label: string }
  onSelectDate: (date: string) => void
}) {
  const joined = profile.created_at.slice(0, 10)
  const joinedDate = trackingStart && trackingStart > joined ? trackingStart : joined
  const total = totalPoints(pointsByDate, dates)
  const rate = activeDayRate(pointsByDate, dates, today, joinedDate)
  const streak = currentStreak(pointsByDate, dates, today)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar profile={profile} size="md" status={presence} />
          <span className="text-sm font-semibold text-slate-800">{profile.name}</span>
        </div>
        <div className="flex gap-4 text-right text-xs text-slate-500">
          <div>
            <div className="text-sm font-semibold text-slate-800">{total}</div>
            <div>points</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{Math.round(rate * 100)}%</div>
            <div>active days</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{streak}</div>
            <div>day streak</div>
          </div>
        </div>
      </div>
      <Heatmap
        dates={dates}
        pointsByDate={pointsByDate}
        today={today}
        joinedDate={joinedDate}
        cellSize={10}
        milestone={milestone}
        onSelectDate={onSelectDate}
      />
    </div>
  )
}
