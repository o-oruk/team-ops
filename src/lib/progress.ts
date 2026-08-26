import type { Task } from '../types'

// Fixed sprint window: today the app was built through the pitch competition.
export const SPRINT_START = '2026-08-17'
export const SPRINT_END = '2026-10-15'

export type PointLevel = 'future' | 'not-joined' | 'red' | 'orange' | 'yellow' | 'green'

// Points a day needs to count as "strong" (green on the heatmap).
export const STRONG_DAY_POINTS = 5

export function todayISO() {
  return new Date().toLocaleDateString('en-CA')
}

export function dateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (cursor <= last) {
    dates.push(cursor.toLocaleDateString('en-CA'))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function levelForPoints(
  points: number,
  date: string,
  today: string,
  joinedDate?: string,
): PointLevel {
  if (joinedDate && date < joinedDate) return 'not-joined'
  if (date > today) return 'future'
  if (points <= 0) return 'red'
  if (points <= 2) return 'orange'
  if (points < STRONG_DAY_POINTS) return 'yellow'
  return 'green'
}

export const LEVEL_COLOR: Record<PointLevel, string> = {
  future: '#e5e7eb',
  'not-joined': '#94a3b8',
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
}

export const LEVEL_LABEL: Record<PointLevel, string> = {
  future: 'Upcoming',
  'not-joined': 'Not on the team yet',
  red: 'No execution (0 pts)',
  orange: 'Light day (1-2 pts)',
  yellow: 'Moderate day (3-4 pts)',
  green: 'Strong day (5+ pts)',
}

/** "Alice", "Alice & Bob", or "Alice, Bob & Carol" — for crediting multiple task completers. */
export function joinNames(names: string[]) {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

/** Tasks completed on a given date, optionally restricted to one member. Heaviest first. */
export function tasksCompletedOn(tasks: Task[], date: string, memberId?: string): Task[] {
  return tasks
    .filter(
      (t) =>
        t.status === 'done' &&
        t.completed_date === date &&
        (!memberId || t.assignee_ids.includes(memberId)),
    )
    .sort((a, b) => b.weight - a.weight)
}

/** Team points for each date in range: sum of weight for tasks completed that day. */
export function teamPointsByDate(tasks: Task[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const task of tasks) {
    if (task.status !== 'done' || !task.completed_date) continue
    map.set(task.completed_date, (map.get(task.completed_date) ?? 0) + task.weight)
  }
  return map
}

/** Points for one member for each date in range. Every assignee of a completed task gets full credit. */
export function memberPointsByDate(tasks: Task[], memberId: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const task of tasks) {
    if (task.status !== 'done' || !task.completed_date || !task.assignee_ids.includes(memberId)) continue
    map.set(task.completed_date, (map.get(task.completed_date) ?? 0) + task.weight)
  }
  return map
}

export function totalPoints(pointsByDate: Map<string, number>, dates: string[]): number {
  return dates.reduce((sum, d) => sum + (pointsByDate.get(d) ?? 0), 0)
}

export function activeDayRate(
  pointsByDate: Map<string, number>,
  dates: string[],
  today: string,
  joinedDate?: string,
): number {
  const pastDates = dates.filter((d) => d <= today && (!joinedDate || d >= joinedDate))
  if (pastDates.length === 0) return 0
  const active = pastDates.filter((d) => (pointsByDate.get(d) ?? 0) > 0).length
  return active / pastDates.length
}

/** Consecutive days (ending today) with at least `minPoints`. Today doesn't break the streak until it's over. */
export function currentStreak(
  pointsByDate: Map<string, number>,
  dates: string[],
  today: string,
  minPoints = 1,
): number {
  const past = dates.filter((d) => d <= today).sort().reverse()
  if (past.length === 0) return 0
  let start = 0
  if (past[0] === today && (pointsByDate.get(today) ?? 0) < minPoints) start = 1
  let streak = 0
  for (let i = start; i < past.length; i++) {
    if ((pointsByDate.get(past[i]) ?? 0) >= minPoints) streak++
    else break
  }
  return streak
}

/** Group dates into weeks (Sun-Sat columns) for a GitHub-style grid, padded to full weeks. */
export function toWeeks(dates: string[]): (string | null)[][] {
  if (dates.length === 0) return []
  const first = new Date(dates[0] + 'T00:00:00')
  const leadingBlanks = first.getDay() // 0 = Sunday
  const padded: (string | null)[] = [...Array(leadingBlanks).fill(null), ...dates]
  while (padded.length % 7 !== 0) padded.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7))
  }
  return weeks
}
