import { useState } from 'react'
import { formatTime, toISODate, type AgendaEvent } from '../../lib/calendar'
import { DATE_TYPE_COLOR, DATE_TYPE_LABEL, type DateType, type ImportantDate } from '../../types'
import { DatePicker } from '../shared/DatePicker'
import { AddDateModal } from './AddDateModal'

const TYPES: DateType[] = ['event', 'meeting', 'deadline']

function EditDateRow({
  event,
  onSave,
  onCancel,
}: {
  event: AgendaEvent
  onSave: (fields: Partial<Pick<ImportantDate, 'title' | 'date' | 'time' | 'type' | 'note'>>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(event.title)
  const [date, setDate] = useState(event.date)
  const [time, setTime] = useState(event.time ?? '')
  const [type, setType] = useState<DateType>(event.type)
  const [note, setNote] = useState(event.note ?? '')
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    if (!title.trim() || !date) return
    setBusy(true)
    try {
      await onSave({ title: title.trim(), date, time: time || null, type, note: note.trim() || null })
    } finally {
      setBusy(false)
    }
  }

  const typeColor = DATE_TYPE_COLOR[type]

  return (
    <li
      className="space-y-2 rounded-lg border px-3 py-2.5"
      style={{ backgroundColor: `${typeColor}1a`, borderColor: `${typeColor}4d` }}
    >
      <div className="flex flex-wrap gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-[120px] flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
        />
        <DatePicker value={date} onChange={setDate} minDate={toISODate(new Date())} confirmSelection />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>
      <div className="flex gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
              type === t ? 'border-transparent text-white' : 'border-slate-200 text-slate-500'
            }`}
            style={type === t ? { backgroundColor: DATE_TYPE_COLOR[t] } : undefined}
          >
            {DATE_TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-white">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={busy}
          className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </li>
  )
}

export function DayPanel({
  date,
  events,
  onAddDate,
  onUpdateDate,
  onDeleteDate,
}: {
  date: string
  events: AgendaEvent[]
  onAddDate: (input: {
    title: string
    date: string
    time: string | null
    type: DateType
    note: string | null
  }) => Promise<void>
  onUpdateDate: (
    id: string,
    fields: Partial<Pick<ImportantDate, 'title' | 'date' | 'time' | 'type' | 'note'>>,
  ) => Promise<void>
  onDeleteDate: (id: string) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const isPastDay = date < toISODate(new Date())

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">{label}</h3>

      {events.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing on the calendar for this day.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((event) =>
            editingId === event.id ? (
              <EditDateRow
                key={event.id}
                event={event}
                onCancel={() => setEditingId(null)}
                onSave={async (fields) => {
                  await onUpdateDate(event.id, fields)
                  setEditingId(null)
                }}
              />
            ) : (
              <li
                key={event.id}
                className={`flex items-center justify-between gap-2 rounded-lg border border-slate-200 py-2 pl-3 pr-3 ${
                  isPastDay ? 'opacity-50' : ''
                }`}
                style={{ borderLeft: `4px solid ${DATE_TYPE_COLOR[event.type]}` }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DATE_TYPE_COLOR[event.type] }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {event.title}
                      {event.time && <span className="ml-1.5 font-normal text-slate-400">{formatTime(event.time)}</span>}
                    </p>
                    {event.note && <p className="text-xs text-slate-500">{event.note}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditingId(event.id)}
                    className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${event.title}"?`)) void onDeleteDate(event.id)
                    }}
                    className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <button
        onClick={() => setAdding(true)}
        className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-accent hover:text-accent"
      >
        + Create an entry
      </button>

      {adding && (
        <AddDateModal date={date} onSubmit={onAddDate} onClose={() => setAdding(false)} />
      )}
    </div>
  )
}
