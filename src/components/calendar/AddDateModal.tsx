import type { DateType } from '../../types'
import { ImportantDateForm } from './ImportantDateForm'

export function AddDateModal({
  date,
  onSubmit,
  onClose,
}: {
  date: string
  onSubmit: (input: {
    title: string
    date: string
    time: string | null
    end_time: string | null
    type: DateType
    note: string | null
  }) => Promise<void>
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Create an entry</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <ImportantDateForm
          defaultDate={date}
          onSubmit={async (input) => {
            await onSubmit(input)
            onClose()
          }}
        />
      </div>
    </div>
  )
}
