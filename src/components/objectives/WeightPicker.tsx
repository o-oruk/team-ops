import { useEffect, useRef, useState } from 'react'
import { WEIGHT_LABELS, type TaskWeight } from '../../types'

const WEIGHTS: TaskWeight[] = [1, 2, 3]
const DOT_COUNT: Record<TaskWeight, number> = { 1: 1, 2: 2, 3: 3 }

function WeightDots({ weight, active }: { weight: TaskWeight; active: boolean }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: DOT_COUNT[weight] }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-accent' : 'bg-slate-400'}`}
        />
      ))}
    </span>
  )
}

export function WeightPicker({
  value,
  onChange,
  invalid = false,
}: {
  value: TaskWeight | null
  onChange: (weight: TaskWeight) => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${
          invalid ? 'border-red-400 hover:border-red-500' : 'border-slate-300 hover:border-accent'
        }`}
      >
        {value === null ? (
          <span className="text-slate-400">Size</span>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-700">
            <WeightDots weight={value} active />
            {WEIGHT_LABELS[value]}
          </span>
        )}
        <svg viewBox="0 0 12 8" className="h-2 w-2.5 shrink-0 text-slate-400" fill="none">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div data-no-drag className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          {WEIGHTS.map((w) => {
            const isSelected = value === w
            return (
              <button
                key={w}
                type="button"
                onClick={() => {
                  onChange(w)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${
                  isSelected ? 'bg-accent-light' : ''
                }`}
              >
                <WeightDots weight={w} active={isSelected} />
                <span className="flex-1 truncate text-slate-700">{WEIGHT_LABELS[w]}</span>
                {isSelected && (
                  <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0 text-accent" fill="none">
                    <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
