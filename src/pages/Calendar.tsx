import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useImportantDates } from '../hooks/useImportantDates'
import { todayISO } from '../hooks/useTasks'
import { DayPanel } from '../components/calendar/DayPanel'
import { GoogleCalendarSync } from '../components/calendar/GoogleCalendarSync'
import { MonthCalendar } from '../components/calendar/MonthCalendar'
import { UpcomingList } from '../components/calendar/UpcomingList'
import { startOfMonth, type AgendaEvent } from '../lib/calendar'

export function Calendar() {
  const { profile } = useAuth()
  const { dates, addDate, updateDate, deleteDate } = useImportantDates()
  const today = todayISO()

  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(today)

  function jumpTo(date: string) {
    setMonthDate(startOfMonth(new Date(date + 'T00:00:00')))
    setSelectedDate(date)
  }

  const events: AgendaEvent[] = dates.map((d) => ({
    id: d.id,
    date: d.date,
    time: d.time,
    end_time: d.end_time,
    title: d.title,
    type: d.type,
    note: d.note,
  }))

  const eventsByDate = new Map<string, AgendaEvent[]>()
  for (const event of events) {
    eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event])
  }
  for (const dayEvents of eventsByDate.values()) {
    dayEvents.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Calendar</h1>
        <GoogleCalendarSync events={events} today={today} />
      </div>

      <UpcomingList events={events} today={today} onJumpTo={jumpTo} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <MonthCalendar
          monthDate={monthDate}
          onMonthChange={(d) => setMonthDate(startOfMonth(d))}
          eventsByDate={eventsByDate}
          today={today}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {profile && (
          <DayPanel
            date={selectedDate}
            events={eventsByDate.get(selectedDate) ?? []}
            onAddDate={(input) => addDate({ ...input, createdBy: profile.id })}
            onUpdateDate={updateDate}
            onDeleteDate={deleteDate}
          />
        )}
      </div>
    </div>
  )
}
