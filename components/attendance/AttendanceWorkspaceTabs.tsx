import Link from 'next/link'

/** One task hub with distinct monitoring (read-only) and HR decision views. */
export function AttendanceWorkspaceTabs({ current, period }: { current: 'data' | 'review'; period: string }) {
  const views = [
    { id: 'data', label: 'Data Kehadiran', href: '/hr/attendance/data', hint: 'Pantau data aktual' },
    { id: 'review', label: 'Review HR', href: '/hr/attendance/approvals', hint: 'Periksa status dan persetujuan' },
  ] as const
  return <nav aria-label="Data dan approval absensi" className="harmony-review-tabs flex flex-wrap gap-2 rounded-[19px] border border-white/70 bg-white/55 p-2 shadow-sm backdrop-blur-2xl">
    {views.map(item => <Link key={item.id} href={`${item.href}?period=${encodeURIComponent(period)}`}
      aria-current={current === item.id ? 'page' : undefined}
      className={`harmony-review-tab inline-flex min-h-10 flex-col justify-center rounded-[13px] px-4 text-xs transition-colors ${current === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}>
      <span className="font-semibold">{item.label}</span>
      <span className={`mt-0.5 text-[10px] ${current === item.id ? 'text-white/65' : 'text-slate-400'}`}>{item.hint}</span>
    </Link>)}
  </nav>
}
