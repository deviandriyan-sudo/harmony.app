'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, Loader2, RefreshCw } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { RemedProcessHistory } from '@/components/remed/RemedProcessHistory'
import { remedFetch } from '@/lib/remed-client'
import type { RemedProcessHistory as HistoryItem } from '@/types/remed'

export function RemedHistoryWorkspace({ role }: { role: 'hr' | 'finance' }) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await remedFetch<{ history: HistoryItem[] }>('/api/remed/history?limit=1000')
      setHistory(payload.history || [])
    } catch (issue: unknown) {
      setError(issue instanceof Error ? issue.message : 'Gagal memuat riwayat Re-Med.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])
  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader eyebrow={`Re-Med · ${role === 'hr' ? 'HR' : 'Finance'}`}
        title="Riwayat Proses Re-Med"
        description={role === 'hr'
          ? 'Approval, reject, pembayaran, pembatalan, dan penghapusan klaim dalam satu riwayat proses.'
          : 'Approval HR/Finance, reject beserta alasan, pembayaran, pembatalan, dan penghapusan dalam satu menu.'}
        icon={History}
        actions={<button type="button" onClick={() => void load()} disabled={loading} className="harmony-button-secondary min-h-10 px-4">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Refresh
        </button>}
      />
      {error ? <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <RemedProcessHistory history={history} allowDelete={role === 'hr'} onDeleted={role === 'hr' ? load : undefined} />
    </section>
  )
}
