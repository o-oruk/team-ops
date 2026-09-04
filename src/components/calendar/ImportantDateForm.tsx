import { useState, type FormEvent } from 'react'
import { addOneHourCapped, toISODate } from '../../lib/calendar'
import { DATE_TYPE_COLOR, DATE_TYPE_LABEL, type DateType } from '../../types'
import { DatePicker } from '../shared/DatePicker'
import { TimeSelect } from '../shared/TimeSelect'

const TYPES: DateType[] = ['event', 'meeting', 'deadline']

export function ImportantDateForm({
  defaultDate,
  onSubmit,
}: {
  defaultDate: string
  onSubmit: (input: {
    title: string
    date: string
    time: string | null
    end_time: string | null
    type: DateType
    note: string | null
  }) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [type, setType] = useState<DateType>('event')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  function handleTimeChange(newTime: string) {
    setTime(newTime)
    if (!newTime) setEndTime('')
    else if (!endTime) setEndTime(addOneHourCapped(newTime))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        date,
        time: time || null,
        end_time: time ? endTime || addOneHourCapped(time) : null,
        type,
        note: note.trim() || null,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="date-title" className="block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="date-title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the date for?"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Date</span>
        <div className="mt-1">
          <DatePicker
            value={date}
            onChange={setDate}
            placeholder="Pick a date"
            triggerClassName="w-full py-2"
            minDate={toISODate(new Date())}
            confirmSelection
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="date-time" className="block text-sm font-medium text-slate-700">
            Start time <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <TimeSelect
            id="date-time"
            value={time}
            onChange={handleTimeChange}
            allowEmpty
            className="mt-1 w-full"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="date-end-time" className="block text-sm font-medium text-slate-700">
            End time
          </label>
          <TimeSelect
            id="date-end-time"
            value={endTime}
            onChange={setEndTime}
            disabled={!time}
            className="mt-1 w-full"
          />
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Type</span>
        <div className="mt-1 flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                type === t ? 'border-transparent text-white' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
              style={type === t ? { backgroundColor: DATE_TYPE_COLOR[t] } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: type === t ? 'white' : DATE_TYPE_COLOR[t] }}
              />
              {DATE_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="date-note" className="block text-sm font-medium text-slate-700">
          Note <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="date-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-accent"
        />
      </div>

      <button
        type="submit"
        disabled={busy || !title.trim() || !date}
        className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create entry'}
      </button>
    </form>
  )
}
