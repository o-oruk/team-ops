import { TIME_OPTIONS, formatTime } from '../../lib/calendar'

/** A time-of-day <select> restricted to 5-minute increments, like Google Calendar's picker. */
export function TimeSelect({
  id,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = 'No time',
  disabled = false,
  className = '',
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  allowEmpty?: boolean
  emptyLabel?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {formatTime(t)}
        </option>
      ))}
    </select>
  )
}
