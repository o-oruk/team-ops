import JSZip from 'jszip'
import { supabase } from './supabase'

/**
 * Bump this whenever a table/column included below changes shape, so a future import feature (and
 * anyone reading an old export) can tell which layout a given .zip was written against.
 */
const SCHEMA_VERSION = 1

type Row = Record<string, unknown>

/** RFC 4180 escaping: quote only when needed, double up embedded quotes. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function toCsv(rows: Row[], columns: readonly string[]): string {
  const lines = rows.map((row) => columns.map((col) => csvCell(row[col])).join(','))
  return [columns.join(','), ...lines].join('\r\n') + '\r\n'
}

async function fetchAll(table: string, orderBy: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*').order(orderBy)
  if (error) throw new Error(`Could not read "${table}": ${error.message}`)
  return data ?? []
}

/** Column order for each table's CSV — the full, current column list from supabase/schema.sql. */
const COLUMNS = {
  profiles: ['id', 'name', 'email', 'initials', 'color', 'role', 'claimed', 'created_at'],
  objectives: ['id', 'title', 'position', 'hue', 'created_at'],
  tasks: [
    'id',
    'objective_id',
    'title',
    'weight',
    'status',
    'scheduled_date',
    'due_date',
    'completed_by',
    'completed_date',
    'created_by',
    'created_at',
  ],
  task_assignees: ['task_id', 'profile_id'],
  important_dates: ['id', 'title', 'date', 'time', 'end_time', 'type', 'note', 'created_by', 'created_at'],
  messages: ['id', 'sender_id', 'body', 'created_at'],
  message_reads: ['profile_id', 'last_read_at'],
} as const

/**
 * Pulls every table that makes up the dashboard's actual content and bundles it into one .zip:
 * one CSV per table (openable directly in Excel/Sheets) plus a manifest documenting exactly how
 * to read them back. Written so a future "import" feature has everything it needs to reconstruct
 * the site's condition losslessly — see manifest.known_limitations for the one real gap (Supabase
 * auth accounts can't be recreated with their original IDs).
 */
export async function exportAllData(): Promise<void> {
  const [profiles, objectives, tasks, taskAssignees, importantDates, messages, messageReads] = await Promise.all([
    fetchAll('profiles', 'created_at'),
    fetchAll('objectives', 'position'),
    fetchAll('tasks', 'created_at'),
    fetchAll('task_assignees', 'task_id'),
    fetchAll('important_dates', 'date'),
    fetchAll('messages', 'created_at'),
    fetchAll('message_reads', 'profile_id'),
  ])

  const zip = new JSZip()
  zip.file('profiles.csv', toCsv(profiles, COLUMNS.profiles))
  zip.file('objectives.csv', toCsv(objectives, COLUMNS.objectives))
  zip.file('tasks.csv', toCsv(tasks, COLUMNS.tasks))
  zip.file('task_assignees.csv', toCsv(taskAssignees, COLUMNS.task_assignees))
  zip.file('important_dates.csv', toCsv(importantDates, COLUMNS.important_dates))
  zip.file('messages.csv', toCsv(messages, COLUMNS.messages))
  zip.file('message_reads.csv', toCsv(messageReads, COLUMNS.message_reads))

  const manifest = {
    exported_at: new Date().toISOString(),
    app: 'Amana Vision team dashboard',
    schema_version: SCHEMA_VERSION,
    row_counts: {
      profiles: profiles.length,
      objectives: objectives.length,
      tasks: tasks.length,
      task_assignees: taskAssignees.length,
      important_dates: importantDates.length,
      messages: messages.length,
      message_reads: messageReads.length,
    },
    csv_conventions: {
      empty_cell: 'SQL NULL. The app never stores a meaningful empty string, so this is unambiguous.',
      booleans: 'the literal text "true" or "false"',
      dates: '"YYYY-MM-DD", as Postgres returns a `date` column',
      times: '"HH:MM:SS" (24h), as Postgres returns a `time` column',
      timestamps: 'ISO 8601 with timezone offset, as Postgres returns a `timestamptz` column',
      ids: 'UUIDs as plain text — see known_limitations for the one case these can\'t be restored as-is',
      foreign_keys:
        'tasks.objective_id -> objectives.id; tasks.completed_by/created_by, task_assignees.profile_id, ' +
        'messages.sender_id, message_reads.profile_id, important_dates.created_by -> profiles.id; ' +
        'task_assignees.task_id -> tasks.id',
    },
    known_limitations: [
      'profiles.id is a foreign key into Supabase\'s own auth.users table, which this export ' +
        'cannot include and a restore cannot recreate with matching IDs — signing someone up ' +
        'via Supabase Auth always assigns a brand-new UUID. A future import has to: (1) for each ' +
        'row in profiles.csv, find or create the matching auth user by email, (2) build an ' +
        'old-id -> new-id map from that, (3) rewrite every foreign key listed above through that ' +
        'map before inserting tasks/task_assignees/messages/message_reads/important_dates.',
      'google_calendar_links and important_dates.google_event_id are deliberately left out — ' +
        'they are per-browser Google Calendar bookkeeping, not dashboard content, and would be ' +
        'meaningless (or wrong) if replayed into a different Google account.',
      'message_reads.csv only ever contains the row for whoever ran this export — Row Level ' +
        'Security restricts that table to each user\'s own "last read" marker, unlike every ' +
        'other table here. Getting the whole team\'s read receipts means each teammate running ' +
        'the export once and merging the single-row CSVs. Low stakes either way: it only drives ' +
        'the chat unread-count badge, nothing else depends on it.',
    ],
  }
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = `amana-vision-export-${new Date().toISOString().slice(0, 10)}.zip`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
