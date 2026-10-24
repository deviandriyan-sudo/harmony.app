'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FolderLock } from 'lucide-react'
import { ProfileWorkspace } from '@/components/profile/ProfileWorkspace'
export default function HRProfilePage(){const params=useParams<{employeeId:string}>();return <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6"><div className="mb-4 flex flex-wrap gap-2"><Link href="/hr/employees" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-xs font-semibold text-blue-700"><ArrowLeft size={15}/> Data Karyawan</Link><Link href={`/hr/employees/profile/${encodeURIComponent(params.employeeId)}/documents`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-xs font-semibold text-blue-700"><FolderLock size={15}/> Dokumen Karyawan</Link></div><ProfileWorkspace employeeId={params.employeeId} readOnly/></main>}
