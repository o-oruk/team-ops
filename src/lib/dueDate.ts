/** Split into prefix/redPart/suffix so "N days" can be styled separately from the rest of the text. */
export function dueCountdownParts(dueDate: string, today: string) {
  const diffDays = Math.round(
    (new Date(dueDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86_400_000,
  )
  if (diffDays === 0) return { prefix: 'Due today', redPart: null as string | null, suffix: '!' }
  if (diffDays === 1) return { prefix: 'Due ', redPart: 'tomorrow', suffix: '' }
  if (diffDays > 0) {
    return { prefix: 'Due in ', redPart: `${diffDays} days`, suffix: '' }
  }
  const overdueDays = Math.abs(diffDays)
  return { prefix: '', redPart: `${overdueDays} day${overdueDays === 1 ? '' : 's'}`, suffix: ' overdue' }
}

export function isUrgentDue(dueDate: string | null, done: boolean, today: string) {
  return !!dueDate && !done && dueDate <= today
}
