'use client'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'
import { ProfileWorkspace } from '@/components/profile/ProfileWorkspace'
// Same HR authorization as employee detail, with document category preselected.
export default function HRDocumentsPage() {
  const params = useParams<{ employeeId: string }>()
  return <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6">
    <Link href={`/hr/employees/profile/${encodeURIComponent(params.employeeId)}`} className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-xs font-semibold text-blue-700"><ArrowLeft size={15} /> Biodata Karyawan <Users size={14}/></Link>
    <ProfileWorkspace employeeId={params.employeeId} readOnly initialSection="documents" />
  </main>
}
