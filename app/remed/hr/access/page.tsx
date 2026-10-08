'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Mail, Pencil, Save, ShieldCheck, X } from 'lucide-react'
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
  const [editingId, setEditingId] = useState('')
  const [editingEmail, setEditingEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const load = () => remedFetch<{ access: AccessRow[] }>('/api/remed/hr/access').then((payload) => setRows(payload.access || []))

  useEffect(() => { void load() }, [])

  function startEditEmail(row: AccessRow) {
    setEditingId(row.id)
    setEditingEmail(row.email)
    setMessage('')
  }

  function cancelEditEmail() {
    if (savingEmail) return
    setEditingId('')
    setEditingEmail('')
  }

  async function saveEmail(row: AccessRow) {
    const nextEmail = editingEmail.trim().toLowerCase()
    if (!nextEmail || !nextEmail.includes('@')) {
      setMessage('Email baru tidak valid.')
      return
    }
    if (nextEmail === row.email.trim().toLowerCase()) {
      cancelEditEmail()
      return
    }

    setSavingEmail(true)
    setMessage('')
    try {
      const result = await remedFetch<{
        success: boolean
        message: string
        notification?: {
          old_email?: { success?: boolean }
          new_email?: { success?: boolean }
        }
      }>('/api/remed/hr/access', {
        method: 'PATCH',
        body: JSON.stringify({
          access_id: row.id,
          new_email: nextEmail,
        }),
      })

      const notificationWarning =
        result.notification?.old_email?.success === false ||
        result.notification?.new_email?.success === false

      setMessage(
        `${result.message || 'Email berhasil diperbarui.'}${notificationWarning ? ' Perubahan berhasil, tetapi sebagian email notifikasi belum terkirim.' : ''}`,
      )
      setEditingId('')
      setEditingEmail('')
      await load()
    } catch (error: any) {
      setMessage(error?.message || 'Gagal mengubah email akses.')
    } finally {
      setSavingEmail(false)
    }
  }

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
              <div className="min-w-0 flex-1">
                {editingId === row.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8190]" />
                      <input
                        type="email"
                        value={editingEmail}
                        onChange={(event) => setEditingEmail(event.target.value)}
                        className="harmony-input min-h-10 pl-9"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEmail(row)}
                        disabled={savingEmail}
                        className="harmony-button-primary min-h-10 px-3 text-xs disabled:opacity-60"
                      >
                        <Save size={14} /> Simpan
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditEmail}
                        disabled={savingEmail}
                        className="harmony-button-secondary min-h-10 px-3 text-xs disabled:opacity-60"
                      >
                        <X size={14} /> Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="truncate font-bold text-[#17181b]">{row.email}</p>
                    <p className="mt-1 text-xs text-[#747982]">{row.role} · {row.auth_user_id ? 'Auth linked' : 'Auth belum dibuat'}</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId !== row.id ? (
                  <button
                    type="button"
                    onClick={() => startEditEmail(row)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-[14px] border border-black/[0.06] bg-white px-3 text-xs font-bold text-[#315f8f] shadow-sm transition hover:bg-blue-50"
                  >
                    <Pencil size={13} /> Email
                  </button>
                ) : null}
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {row.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
