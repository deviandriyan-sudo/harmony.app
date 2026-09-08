'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('harmony_user')
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={[
        'flex w-full items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white text-sm font-semibold text-red-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60',
        compact ? 'min-h-11 px-3' : 'min-h-12 px-5',
      ].join(' ')}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
      {loading ? 'Keluar...' : 'Keluar'}
    </button>
  )
}
