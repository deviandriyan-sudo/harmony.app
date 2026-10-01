'use client'

import { FormEvent, useEffect, useState } from 'react'
import { remedFetch } from '@/lib/remed-client'

type AccessRow = {
  id: string
  auth_user_id: string | null
  employee_id: string | null
  email: string
  role: 'employee' | 'hr' | 'finance'
  is_active: boolean
}

export default function Page() {
  const [rows, setRows] = useState<AccessRow[]>([])
  const [msg, setMsg] = useState('')

  const load = () => remedFetch<{ access: AccessRow[] }>('/api/remed/hr/access').then((x) => setRows(x.access))

  useEffect(() => {
    load().catch(() => {})
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fd = new FormData(form)

    try {
      await remedFetch('/api/remed/hr/access', {
        method: 'POST',
        body: JSON.stringify({
          email: fd.get('email'),
          role: fd.get('role'),
          password: fd.get('password'),
          is_active: true,
        }),
      })
      setMsg('Akses tersimpan.')
      form.reset()
      await load()
    } catch (error: any) {
      setMsg(error?.message || 'Gagal menyimpan akses.')
    }
  }

  return (
    <section className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-semibold">Akses Re-Med</h1>
      <p className="mt-2 text-sm text-[#6e6e73]">
        Employee mengikuti akun HARMONY yang sudah terhubung ke master employee. Halaman ini khusus akses tambahan HR Re-Med dan Finance.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-[26px] border border-black/5 bg-white p-5 md:grid-cols-4">
        <input
          name="email"
          type="email"
          required
          placeholder="finance@..."
          className="rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm"
        />
        <select name="role" className="rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm">
          <option value="finance">Finance</option>
          <option value="hr">HR Re-Med</option>
        </select>
        <input
          name="password"
          type="password"
          placeholder="Password awal (opsional)"
          className="rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm"
        />
        <button className="rounded-2xl bg-[#18794e] px-4 py-3 text-sm font-semibold text-white">Simpan</button>
      </form>

      {msg && <p className="mt-3 text-sm">{msg}</p>}

      <div className="mt-6 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-4 py-3 text-sm">
            <div>
              <p className="font-semibold">{row.email}</p>
              <p className="text-xs text-[#6e6e73]">
                {row.role} · {row.auth_user_id ? 'Auth linked' : 'Auth belum dibuat'}
              </p>
            </div>
            <span className={row.is_active ? 'text-emerald-700' : 'text-red-700'}>
              {row.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
