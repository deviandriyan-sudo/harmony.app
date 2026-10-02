'use client'

import { useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { RemedProcessHistory } from '@/components/remed/RemedProcessHistory'
import { remedFetch } from '@/lib/remed-client'
import type { RemedProcessHistory as HistoryItem } from '@/types/remed'

export default function Page() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const payload = await remedFetch<{ history: HistoryItem[] }>('/api/remed/history?limit=1000')
      setHistory(payload.history || [])
    } catch (issue: any) {
      setError(issue?.message || 'Gagal memuat riwayat Re-Med.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#1d1d1f]">Riwayat Proses Re-Med</h1>
          <p className="mt-2 text-sm text-[#6e6e73]">Satu riwayat untuk approval, reject, pembayaran, pembatalan, dan penghapusan klaim.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Refresh
        </button>
      </div>
      {error ? <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <div className="mt-6"><RemedProcessHistory history={history} allowDelete onDeleted={load} /></div>
    </section>
  )
}
