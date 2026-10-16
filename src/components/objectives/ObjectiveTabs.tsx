import { useState, type FormEvent } from 'react'
import { objectiveTabStyle } from '../../lib/color'
import type { Objective } from '../../types'

export function ObjectiveTabs({
  objectives,
  activeId,
  pendingCounts,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  isAdmin,
}: {
  objectives: Objective[]
  activeId: string | null
  pendingCounts: Record<string, number>
  onSelect: (id: string) => void
  onAdd: (title: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isAdmin: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await onAdd(title.trim())
    setTitle('')
    setAdding(false)
  }

  async function saveRename(obj: Objective) {
    const trimmed = editTitle.trim()
    setEditingId(null)
    if (trimmed && trimmed !== obj.title) await onRename(obj.id, trimmed)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
      {objectives.map((obj) => {
        const isActive = activeId === obj.id
        const isEditing = editingId === obj.id

        if (isEditing) {
          return (
            <input
              key={obj.id}
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => void saveRename(obj)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveRename(obj)
                if (e.key === 'Escape') setEditingId(null)
              }}
              className="rounded-full border border-accent px-4 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-accent"
              style={{ minWidth: 140 }}
            />
          )
        }

        return (
          <div key={obj.id} className="group relative">
            <button
              onClick={() => onSelect(obj.id)}
              onDoubleClick={() => {
                if (!isAdmin) return
                setEditingId(obj.id)
                setEditTitle(obj.title)
              }}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={objectiveTabStyle(obj.hue, isActive)}
            >
              {obj.title}
              <span className="ml-1.5 opacity-80">
                [{pendingCounts[obj.id] ?? 0}]
              </span>
            </button>
            {isAdmin && (
              <div
                className={`absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex ${isActive ? 'flex' : ''}`}
              >
                <button
                  onClick={() => {
                    setEditingId(obj.id)
                    setEditTitle(obj.title)
                  }}
                  aria-label={`Rename ${obj.title}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[10px] leading-none text-white hover:bg-accent"
                >
                  ✎
                </button>
                <button
                  onClick={() => void onDelete(obj.id)}
                  aria-label={`Delete ${obj.title}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[10px] leading-none text-white hover:bg-red-500"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )
      })}

      {isAdmin &&
        (adding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-1">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => !title.trim() && setAdding(false)}
              placeholder="New objective title"
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-accent"
            />
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-accent hover:text-accent"
          >
            + Objective
          </button>
        ))}
    </div>
  )
}
