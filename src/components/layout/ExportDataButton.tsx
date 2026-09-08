import { useState } from 'react'

export function ExportDataButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setBusy(true)
    setError(null)
    try {
      // Loaded on demand — jszip is only needed once someone actually exports, not on every visit.
      const { exportAllData } = await import('../../lib/exportData')
      await exportAllData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={busy}
        title="Download every task, message, and calendar entry as a backup"
        className="flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <path
            d="M8 1.5v8.5m0 0L4.5 6.5M8 10l3.5-3.5M2.5 12v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {busy ? 'Exporting…' : 'Export Data'}
      </button>
      {error && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
