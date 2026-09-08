import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../../types'
import { usePresence } from '../../hooks/usePresence'
import { Avatar } from '../layout/Avatar'

/**
 * Lets you pick several teammates in one sitting before anything happens — clicks while open only
 * change a local pending selection. Nothing is applied until the explicit Confirm button is
 * pressed, which reports everything that changed via `onApply` in one shot. That's what lets a
 * caller batch a DB write and a single notification covering everyone newly added, instead of one
 * round-trip (and one email) per click — which used to mean the first person assigned had no idea
 * a second person was about to join them. Dismissing any other way (Cancel, clicking outside)
 * discards the pending selection instead.
 */
export function AssigneePicker({
  profiles,
  selectedIds,
  onApply,
}: {
  profiles: Profile[]
  selectedIds: string[]
  onApply: (addedIds: string[], removedIds: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<string[]>(selectedIds)
  const ref = useRef<HTMLDivElement>(null)
  const presence = usePresence()

  function openPicker() {
    setPending(selectedIds)
    setOpen(true)
  }

  function cancel() {
    setOpen(false)
  }

  function confirmSelection() {
    setOpen(false)
    const added = pending.filter((id) => !selectedIds.includes(id))
    const removed = selectedIds.filter((id) => !pending.includes(id))
    if (added.length > 0 || removed.length > 0) onApply(added, removed)
  }

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cancel()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const claimed = profiles.filter((p) => p.claimed)
  const selected = claimed.filter((p) => selectedIds.includes(p.id))
  const hasChanges =
    pending.length !== selectedIds.length || pending.some((id) => !selectedIds.includes(id))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (open ? cancel() : openPicker())}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-sm hover:border-accent"
      >
        {selected.length === 0 ? (
          <span className="text-slate-400">Unassigned</span>
        ) : (
          <div className="flex -space-x-1.5">
            {selected.map((p) => (
              <Avatar key={p.id} profile={p} size="sm" />
            ))}
          </div>
        )}
        <svg viewBox="0 0 12 8" className="h-2 w-2.5 shrink-0 text-slate-400" fill="none">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => setPending([])}
            disabled={pending.length === 0}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
              pending.length === 0 ? 'cursor-default text-slate-300' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-xs text-slate-400">
              ?
            </span>
            <span className="flex-1">Unassigned</span>
            {pending.length === 0 && (
              <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0 text-accent" fill="none">
                <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          {claimed.length > 0 && <div className="my-1 h-px bg-slate-100" />}
          {claimed.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-slate-400">No teammates yet</p>
          ) : (
            claimed.map((p) => {
              const isPending = pending.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setPending((ids) => (isPending ? ids.filter((id) => id !== p.id) : [...ids, p.id]))
                  }
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${
                    isPending ? 'bg-accent-light' : ''
                  }`}
                >
                  <Avatar profile={p} size="sm" status={presence[p.id] ?? 'offline'} />
                  <span className="flex-1 truncate text-slate-700">{p.name}</span>
                  {isPending && (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5 shrink-0 text-accent" fill="none">
                      <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })
          )}
          <div className="my-1 h-px bg-slate-100" />
          <div className="flex gap-1.5 px-0.5 pt-0.5">
            <button
              type="button"
              onClick={cancel}
              className="flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmSelection}
              disabled={!hasChanges}
              className="flex-1 rounded-md bg-accent px-2 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
