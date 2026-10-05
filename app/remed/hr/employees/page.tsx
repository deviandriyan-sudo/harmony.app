'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, UsersRound, WalletCards } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
import { formatRupiah } from '@/lib/remed'
import { remedFetch } from '@/lib/remed-client'
import type { RemedEntitlement } from '@/types/remed'

export default function Page() {
  const [rows, setRows] = useState<RemedEntitlement[]>([])
  const [loading, setLoading] = useState(true)
  const year = new Date().getFullYear()

  async function load() {
    setLoading(true)
    try {
      const payload = await remedFetch<{ entitlements: RemedEntitlement[] }>(`/api/remed/hr/entitlements?year=${year}`)
      setRows(payload.entitlements || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function edit(row: RemedEntitlement) {
    const value = window.prompt(`Plafond ${row.employee?.full_name || ''}:`, String(row.plafond_total))
    if (value === null) return
    try {
      await remedFetch('/api/remed/hr/entitlements', {
        method: 'PUT',
        body: JSON.stringify({ employee_id: row.employee_id, period_year: year, plafond_total: Number(value), note: 'Update HR' }),
      })
      await load()
    } catch (error: any) {
      window.alert(error?.message || 'Gagal memperbarui plafond.')
    }
  }

  return (
    <section className="mx-auto max-w-[1540px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · HR"
        title="Plafond Karyawan"
        description={`Kelola plafond medical reimbursement tahun ${year}. Pemakaian legacy, current used, reserved, dan saldo tersedia tetap terpisah.`}
        icon={UsersRound}
        actions={(
          <button type="button" onClick={load} disabled={loading} className="harmony-button-secondary min-h-10 px-4">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      />

      <div className="harmony-unified-surface overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-[#f6f7f9] text-[11px] font-bold uppercase tracking-[0.08em] text-[#777c85]">
            <tr>
              <th className="px-5 py-4 text-left">Karyawan</th>
              <th className="px-5 py-4 text-left">Plafond</th>
              <th className="px-5 py-4 text-left">Legacy Used</th>
              <th className="px-5 py-4 text-left">Current Used</th>
              <th className="px-5 py-4 text-left">Reserved</th>
              <th className="px-5 py-4 text-left">Tersedia</th>
              <th className="px-5 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.055]">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-[#fafbfc]">
                <td className="px-5 py-4">
                  <p className="font-bold text-[#17181b]">{row.employee?.full_name || row.employee_id}</p>
                  <p className="mt-1 text-xs text-[#858a93]">{row.employee?.employee_number || '-'}</p>
                </td>
                <td className="px-5 py-4 font-semibold text-[#25272c]">{formatRupiah(row.plafond_total)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.legacy_used)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.current_used)}</td>
                <td className="px-5 py-4 text-[#646971]">{formatRupiah(row.reserved_amount)}</td>
                <td className="px-5 py-4 font-bold text-emerald-700">{formatRupiah(row.available_amount)}</td>
                <td className="px-5 py-4 text-right">
                  <button type="button" onClick={() => edit(row)} className="inline-flex min-h-9 items-center gap-1.5 rounded-[13px] bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100">
                    <WalletCards size={14} /> Edit Plafond
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
