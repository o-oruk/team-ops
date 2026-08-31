import type { DateType } from '../types'

export interface AgendaEvent {
  id: string
  date: string
  time: string | null
  title: string
  type: DateType
  note: string | null
}

/** Formats a Postgres time string ("14:30:00") as "2:30 PM". */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

export function toISODate(d: Date): string {
  return d.toLocaleDateString('en-CA')
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

/** 42 dates (6 weeks x 7 days, Sun-Sat) covering the month that contains `d`, padded with adjacent-month days. */
export function monthMatrix(d: Date): Date[] {
  const first = startOfMonth(d)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())

  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    days.push(day)
  }
  return days
}

export const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/** "2026-08-27" -> "Thursday, August 27th, 2026" */
export function formatSpelledOutDate(iso: string): string {
  const date = new Date(iso + 'T00:00:00')
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' })
  const month = date.toLocaleDateString('en-US', { month: 'long' })
  const day = date.getDate()
  return `${weekday}, ${month} ${day}${ordinalSuffix(day)}, ${date.getFullYear()}`
}

/** "Today" / "Tomorrow" / "N days from now" / "N days ago", relative to `today`. */
export function daysUntilLabel(iso: string, today: string): string {
  const target = new Date(iso + 'T00:00:00')
  const now = new Date(today + 'T00:00:00')
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 1) return `${diffDays} days from now`
  if (diffDays === -1) return '1 day ago'
  return `${Math.abs(diffDays)} days ago`
}
