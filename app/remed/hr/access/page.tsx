'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { RemedPageHeader } from '@/components/remed/RemedPageHeader'
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
  const [message, setMessage] = useState('')

  const load = () => remedFetch<{ access: AccessRow[] }>('/api/remed/hr/access').then((payload) => setRows(payload.access || []))

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await remedFetch('/api/remed/hr/access', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          role: formData.get('role'),
          password: formData.get('password'),
          is_active: true,
        }),
      })
      setMessage('Akses tersimpan.')
      form.reset()
      await load()
    } catch (error: any) {
      setMessage(error?.message || 'Gagal menyimpan akses.')
    }
  }

  return (
    <section className="mx-auto max-w-[1240px] space-y-6 p-4 sm:p-6 lg:p-8">
      <RemedPageHeader
        eyebrow="Re-Med · HR"
        title="Akses Re-Med"
        description="Employee mengikuti akun HARMONY yang terhubung ke master employee. Halaman ini khusus akses tambahan HR Re-Med dan Finance."
        icon={ShieldCheck}
      />

      <div className="harmony-unified-surface">
        <form onSubmit={submit} className="grid gap-3 border-b border-black/[0.055] p-5 md:grid-cols-[1fr_180px_1fr_auto] sm:p-6">
          <input name="email" type="email" required placeholder="finance@..." className="harmony-input" />
          <select name="role" className="harmony-select">
            <option value="finance">Finance</option>
            <option value="hr">HR Re-Med</option>
          </select>
          <input name="password" type="password" placeholder="Password awal (opsional)" className="harmony-input" />
          <button type="submit" className="harmony-button-primary min-h-11 px-5">Simpan</button>
        </form>

        {message ? <div className="mx-5 mt-5 rounded-[16px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 sm:mx-6">{message}</div> : null}

        <div className="space-y-2 p-5 sm:p-6">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-col gap-3 rounded-[18px] border border-black/[0.055] bg-[#f8f9fb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-[#17181b]">{row.email}</p>
                <p className="mt-1 text-xs text-[#747982]">{row.role} · {row.auth_user_id ? 'Auth linked' : 'Auth belum dibuat'}</p>
              </div>
              <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {row.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
