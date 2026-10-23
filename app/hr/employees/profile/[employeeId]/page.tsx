'use client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ProfileWorkspace } from '@/components/profile/ProfileWorkspace'
export default function HRProfilePage(){const params=useParams<{employeeId:string}>();return <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6"><Link href="/hr/employees" className="mb-4 inline-block rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-blue-700">← Kembali ke Data Karyawan</Link><ProfileWorkspace employeeId={params.employeeId} readOnly/></main>}
