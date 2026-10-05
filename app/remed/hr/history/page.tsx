'use client'

import { useEffect, useState } from 'react'
import { History, Loader2, RefreshCw } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
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

  useEffect(() => { void load() }, [])

  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · HR"
        title="Riwayat Proses Re-Med"
        description="Approval, reject, pembayaran, pembatalan, dan penghapusan klaim dalam satu riwayat proses."
        icon={History}
        actions={(
          <button type="button" onClick={load} disabled={loading} className="harmony-button-secondary min-h-10 px-4">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Refresh
          </button>
        )}
      />
      {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <RemedProcessHistory history={history} allowDelete onDeleted={load} />
    </section>
  )
}
