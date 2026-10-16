import type { Task } from '../types'

/**
 * Order among tasks due the same day: ones never dragged (newest first) sit above ones given a
 * position by dragging on the Roadmap, which follow their dragged order.
 */
export function byManualOrder(a: Task, b: Task) {
  const aPos = a.position ?? null
  const bPos = b.position ?? null
  if (aPos === null && bPos === null) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  if (aPos === null) return -1
  if (bPos === null) return 1
  return aPos - bPos
}
