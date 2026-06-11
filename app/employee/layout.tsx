'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Menu,
  ShieldAlert,
  X,
} from 'lucide-react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { employeeMenu } from '@/lib/menu'
import { supabase } from '@/lib/supabase'

type AppUser = {
  id: string
  email: string
  role: string
  employee_id: string | null
  is_active: boolean | null
}

type Employee = {
  id: string
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  email?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function getEmployeeName(employee?: Employee | null, fallbackEmail?: string | null) {
  return (
    employee?.full_name ||
    employee?.employee_name ||
    employee?.name ||
    fallbackEmail
      ?.split('@')[0]
      ?.replace(/[._-]/g, ' ')
      ?.replace(/\b\w/g, (char) => char.toUpperCase()) ||
    'Employee'
  )
}

function getEmployeeIdentityList(employee?: Employee | null, fallbackEmail?: string | null) {
  return [
    employee?.id,
    employee?.full_name,
    employee?.employee_name,
    employee?.name,
    employee?.employee_number,
    employee?.nip,
    employee?.machine_pin,
    employee?.email,
    fallbackEmail,
  ]
    .filter(Boolean)
    .map((item) => normalize(String(item)))
}

function isSameSupervisor(value: string | null | undefined, currentEmployee: Employee | null, fallbackEmail?: string | null) {
  const target = normalize(value)

  if (!target || !currentEmployee) return false

  const identities = getEmployeeIdentityList(currentEmployee, fallbackEmail)

  return identities.includes(target)
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  const [userName, setUserName] = useState('Employee')
  const [userEmail, setUserEmail] = useState('')
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)
  const [hasSubordinate, setHasSubordinate] = useState(false)

  const [message, setMessage] = useState('Memeriksa akses akun...')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const filteredEmployeeMenu = useMemo(() => {
    return employeeMenu.filter((item) => {
      const title = normalize(item.title)
      const href = normalize(item.href)

      const isApprovalMenu =
        title.includes('approval') ||
        title.includes('persetujuan') ||
        href.startsWith('/employee/approvals')

      if (isApprovalMenu) {
        return hasSubordinate
      }

      return true
    })
  }, [hasSubordinate])

  useEffect(() => {
    checkAccess()
  }, [])

  useEffect(() => {
    if (!mobileSidebarOpen) return

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileSidebarOpen])

  async function checkAccess() {
    setLoading(true)
    setAllowed(false)
    setMessage('Memeriksa akses akun...')

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      router.replace('/login')
      return
    }

    const authEmail = authData.user.email || ''

    setUserEmail(authEmail)

    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, email, role, employee_id, is_active')
      .eq('id', authData.user.id)
      .maybeSingle<AppUser>()

    if (appUserError) {
      setMessage(appUserError.message)
      setLoading(false)
      return
    }

    if (!appUser) {
      await supabase.auth.signOut()
      router.replace('/login')
      return
    }

    if (!appUser.is_active) {
      await supabase.auth.signOut()
      router.replace('/login')
      return
    }

    if (appUser.role === 'hr') {
      router.replace('/hr/dashboard')
      return
    }

    const { data: employeesData, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true })

    if (employeesError) {
      setMessage(employeesError.message)
      setLoading(false)
      return
    }

    const employees = (employeesData || []) as Employee[]

    const matchedEmployee =
      employees.find((employee) => employee.id === appUser.employee_id) ||
      employees.find((employee) => normalize(employee.email) === normalize(authEmail)) ||
      null

    const name = getEmployeeName(matchedEmployee, authEmail)

    const subordinateExists = employees.some((employee) => {
      if (!matchedEmployee) return false

      return (
        isSameSupervisor(employee.supervisor_1, matchedEmployee, authEmail) ||
        isSameSupervisor(employee.supervisor_2, matchedEmployee, authEmail)
      )
    })

    setCurrentEmployee(matchedEmployee)
    setUserName(name)
    setHasSubordinate(subordinateExists)
    setAllowed(true)
    setLoading(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-black/5 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
            <Loader2 size={26} className="animate-spin" />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">
            Memeriksa Akses
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            {message}
          </p>
        </div>
      </main>
    )
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] p-6">
        <div className="w-full max-w-md rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert size={26} />
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[#1d1d1f]">
            Akses Ditolak
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
            Akun ini tidak memiliki akses ke dashboard employee.
          </p>

          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-[#007aff] px-5 text-sm font-bold text-white transition hover:bg-[#0067d8]"
          >
            Kembali ke Login
          </button>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5f5f7]">
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <div className="hidden lg:block">
          <AppSidebar
            menu={filteredEmployeeMenu}
            title="HARMONY"
            subtitle="Human Attendance & Leave System"
            userName={userName}
            userRole={hasSubordinate ? 'Employee / Atasan' : 'Employee'}
            logoSrc="/logo.png"
          />
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            />

            <div className="absolute left-0 top-0 h-full max-w-[86vw]">
              <AppSidebar
                menu={filteredEmployeeMenu}
                title="HARMONY"
                subtitle="Human Attendance & Leave System"
                userName={userName}
                userRole={hasSubordinate ? 'Employee / Atasan' : 'Employee'}
                logoSrc="/logo.png"
                onNavigate={() => setMobileSidebarOpen(false)}
              />

              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMobileSidebarOpen(false)}
                className="absolute right-[-48px] top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#1d1d1f] shadow-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="sticky top-0 z-40 border-b border-black/5 bg-[#f5f5f7]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1d1d1f] shadow-sm"
                aria-label="Buka menu"
              >
                <Menu size={22} />
              </button>

              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-sm">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white">
                  <Image
                    src="/logo.png"
                    alt="HARMONY Logo"
                    width={30}
                    height={30}
                    className="h-7 w-7 object-contain"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1d1d1f]">
                    HARMONY
                  </p>
                  <p className="truncate text-[11px] font-medium text-[#6e6e73]">
                    Employee Dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}