import { LEVEL_COLOR, SPRINT_END, levelForPoints, toWeeks } from '../../lib/progress'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function Heatmap({
  dates,
  pointsByDate,
  today,
  joinedDate,
  cellSize = 13,
  onSelectDate,
}: {
  dates: string[]
  pointsByDate: Map<string, number>
  today: string
  joinedDate?: string
  cellSize?: number
  onSelectDate?: (date: string) => void
}) {
  const weeks = toWeeks(dates)
  const pitchDayRow = dates.includes(SPRINT_END)
    ? new Date(SPRINT_END + 'T00:00:00').getDay()
    : -1

  return (
    <div className="-m-2 overflow-x-auto p-2">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => {
          const firstDateInWeek = week.find((d): d is string => d !== null)
          const isFirstWeekOfMonth =
            !!firstDateInWeek && new Date(firstDateInWeek + 'T00:00:00').getDate() <= 7
          return (
            <div key={wi} className="flex flex-col gap-[3px]">
              <div style={{ height: 12 }} className="text-[10px] leading-none text-slate-400">
                {isFirstWeekOfMonth && firstDateInWeek
                  ? MONTH_NAMES[new Date(firstDateInWeek + 'T00:00:00').getMonth()]
                  : ''}
              </div>
              {week.map((date, di) => {
                if (!date) {
                  return <div key={di} style={{ width: cellSize, height: cellSize }} />
                }
                const points = pointsByDate.get(date) ?? 0
                const level = levelForPoints(points, date, today, joinedDate)
                const clickable = onSelectDate && level !== 'future' && level !== 'not-joined'
                const isPitchDay = date === SPRINT_END
                const title =
                  level === 'not-joined'
                    ? `${date} — not on the team yet`
                    : level === 'future'
                      ? `${date} — upcoming${isPitchDay ? ' · 🏁 pitch day' : ''}`
                      : `${date} — ${points} point${points === 1 ? '' : 's'}${isPitchDay ? ' · 🏁 pitch day' : ''}${clickable ? ' (click for details)' : ''}`
                return (
                  <button
                    key={di}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && onSelectDate!(date)}
                    title={title}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: LEVEL_COLOR[level],
                    }}
                    className={`relative rounded-[3px] transition-transform ${
                      clickable ? 'cursor-pointer hover:scale-150' : 'cursor-default'
                    }`}
                  >
                    {isPitchDay && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 flex items-center justify-center font-bold text-red-600"
                        style={{ fontSize: cellSize * 0.95, lineHeight: 1, textShadow: '0 0 2px rgba(255,255,255,0.85)' }}
                      >
                        ×
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
        {pitchDayRow !== -1 && (
          <div className="flex flex-col gap-[3px]">
            <div style={{ height: 12 }} />
            {Array.from({ length: 7 }, (_, row) =>
              row === pitchDayRow ? (
                <div
                  key={row}
                  style={{ height: cellSize }}
                  className="flex items-center whitespace-nowrap text-[10px] font-semibold text-red-600"
                >
                  <span aria-hidden="true" className="mr-1">
                    ×
                  </span>
                  Pitch comp day
                </div>
              ) : (
                <div key={row} style={{ height: cellSize }} />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
