import { useEffect, useRef, useState } from 'react'
import {
  MONTH_LABEL,
  WEEKDAY_LABELS,
  addMonths,
  daysUntilLabel,
  formatSpelledOutDate,
  monthMatrix,
  startOfMonth,
  toISODate,
} from '../../lib/calendar'

export function DatePicker({
  value,
  onChange,
  placeholder = 'Date',
  clearable = false,
  triggerClassName = '',
  invalid = false,
  minDate,
  maxDate,
  confirmSelection = false,
}: {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  clearable?: boolean
  triggerClassName?: string
  invalid?: boolean
  minDate?: string
  maxDate?: string
  confirmSelection?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(value ? new Date(value + 'T00:00:00') : new Date()),
  )
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setPendingDate(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const days = monthMatrix(viewMonth)
  const currentMonth = viewMonth.getMonth()
  const today = toISODate(new Date())
  const label = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  function selectDay(iso: string) {
    if (confirmSelection) {
      setPendingDate(iso)
    } else {
      onChange(iso)
      setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setViewMonth(startOfMonth(value ? new Date(value + 'T00:00:00') : new Date()))
          setPendingDate(null)
          setOpen((o) => !o)
        }}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${
          invalid ? 'border-red-400 hover:border-red-500' : 'border-slate-300 hover:border-accent'
        } ${triggerClassName}`}
      >
        <span className={label ? 'text-slate-700' : 'text-slate-400'}>{label ?? placeholder}</span>
        <svg viewBox="0 0 12 8" className="ml-auto h-2 w-2.5 shrink-0 text-slate-400" fill="none">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && pendingDate ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-800">{formatSpelledOutDate(pendingDate)}</p>
          <p className="mt-0.5 text-xs font-medium text-red-500">{daysUntilLabel(pendingDate, today)}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPendingDate(null)}
              className="flex-1 rounded-md border border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(pendingDate)
                setPendingDate(null)
                setOpen(false)
              }}
              className="flex-1 rounded-md bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent/90"
            >
              Confirm
            </button>
          </div>
        </div>
      ) : (
        open && (
          <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                aria-label="Previous month"
                className="rounded px-1.5 py-0.5 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ‹
              </button>
              <span className="text-xs font-semibold text-slate-700">{MONTH_LABEL(viewMonth)}</span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label="Next month"
                className="rounded px-1.5 py-0.5 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-slate-400">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d} className="py-0.5">
                  {d[0]}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day) => {
                const iso = toISODate(day)
                const inMonth = day.getMonth() === currentMonth
                const isSelected = iso === value
                const isToday = iso === today
                const isPast = !!minDate && iso < minDate
                const isFuture = !!maxDate && iso > maxDate
                const isDisabled = isPast || isFuture
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDay(iso)}
                    title={isPast ? 'In the past' : isFuture ? 'In the future' : isToday ? 'Today' : undefined}
                    className={`rounded-md py-1 text-xs transition-colors ${
                      isDisabled
                        ? 'cursor-not-allowed text-slate-200'
                        : isSelected
                          ? 'bg-accent font-semibold text-white'
                          : inMonth
                            ? 'text-slate-700 hover:bg-slate-100'
                            : 'text-slate-300 hover:bg-slate-50'
                    } ${isToday && !isSelected && !isDisabled ? 'ring-1 ring-inset ring-accent font-semibold text-accent' : ''}`}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>

            {clearable && value && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="mt-1.5 w-full rounded-md py-1 text-center text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                Clear date
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}
