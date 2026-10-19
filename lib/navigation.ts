import type { LucideIcon } from 'lucide-react'
import {
  Banknote, CalendarDays, ClipboardCheck, Clock3, HeartPulse,
  History, LayoutDashboard, Settings, UserCheck, Users,
  ShieldCheck,
} from 'lucide-react'

// One navigation registry for HARMONY and Re-Med. URLs remain the original routes.
export type NavigationRole = 'hr' | 'employee' | 'finance'
export type NavigationItem = {
  title: string
  href: string
  icon: LucideIcon
  activePrefixes?: readonly string[]
  remed?: boolean
}
export type NavigationTab = { title: string; href: string; activePrefixes?: readonly string[] }
export type ModuleNavigation = {
  title: string
  prefixes: readonly string[]
  tabs: readonly NavigationTab[]
  detailTabs?: readonly NavigationTab[]
}

const hrItems: NavigationItem[] = [
  { title: 'Beranda', href: '/hr/dashboard', icon: LayoutDashboard },
  { title: 'SDM', href: '/hr/employees', icon: Users, activePrefixes: ['/hr/employees', '/hr/users'] },
  { title: 'Kehadiran', href: '/hr/attendance', icon: Clock3, activePrefixes: ['/hr/attendance', '/hr/leave', '/hr/phl', '/hr/holidays'] },
  { title: 'Re-Med', href: '/remed/hr/dashboard', icon: HeartPulse, remed: true, activePrefixes: ['/remed/hr'] },
  { title: 'Sistem', href: '/hr/settings', icon: Settings, activePrefixes: ['/hr/settings'] },
]
const employeeItems: NavigationItem[] = [
  { title: 'Beranda', href: '/employee/dashboard', icon: LayoutDashboard },
  { title: 'Kehadiran', href: '/employee/attendance', icon: Clock3, activePrefixes: ['/employee/attendance'] },
  { title: 'Pengajuan', href: '/employee/leave', icon: CalendarDays, activePrefixes: ['/employee/leave', '/employee/phl', '/employee/requests'] },
  { title: 'Approval Tim', href: '/employee/approvals', icon: UserCheck, activePrefixes: ['/employee/approvals'] },
  { title: 'Re-Med', href: '/remed/employee/dashboard', icon: HeartPulse, remed: true, activePrefixes: ['/remed/employee'] },
  { title: 'Akun', href: '/employee/settings', icon: Settings, activePrefixes: ['/employee/settings', '/employee/account'] },
]
const financeItems: NavigationItem[] = [
  { title: 'Beranda', href: '/remed/finance/dashboard', icon: LayoutDashboard, remed: true },
  { title: 'Approval', href: '/remed/finance/claims', icon: ClipboardCheck, remed: true, activePrefixes: ['/remed/finance/claims'] },
  { title: 'Pembayaran', href: '/remed/finance/payments', icon: Banknote, remed: true },
  { title: 'Riwayat', href: '/remed/finance/history', icon: History, remed: true },
  { title: 'Akun', href: '/remed/finance/access', icon: ShieldCheck, remed: true },
]
export function navigationForRole(role: NavigationRole, opts: { remed?: boolean; supervisor?: boolean } = {}): NavigationItem[] {
  if (role === 'finance') return financeItems
  if (role === 'hr') return hrItems.filter(item => !item.remed || opts.remed)
  return employeeItems.filter(item => (!item.remed || opts.remed) && (item.title !== 'Approval Tim' || opts.supervisor))
}

export function routeMatches(pathname: string, prefix: string): boolean {
  const normalized = pathname.replace(/\/$/, '') || '/'
  const base = prefix.replace(/\/$/, '') || '/'
  return normalized === base || (base !== '/' && normalized.startsWith(base + '/'))
}
export function isNavigationActive(pathname: string, item: NavigationItem): boolean {
  return (item.activePrefixes || [item.href]).some(prefix => routeMatches(pathname, prefix))
}

const modules: Record<'hr' | 'employee', ModuleNavigation[]> = {
  hr: [
    { title: 'SDM', prefixes: ['/hr/employees', '/hr/users'], tabs: [
      { title: 'Data Karyawan', href: '/hr/employees' },
      { title: 'Akun & Akses', href: '/hr/users' },
    ] },
    { title: 'Kehadiran', prefixes: ['/hr/attendance', '/hr/leave', '/hr/phl', '/hr/holidays'], tabs: [
      { title: 'Absensi', href: '/hr/attendance' },
      { title: 'Cuti & Izin', href: '/hr/leave' },
      { title: 'Saldo PHL', href: '/hr/phl' },
      { title: 'Kalender', href: '/hr/holidays' },
    ] },
    { title: 'Re-Med', prefixes: ['/remed/hr'], tabs: [
      { title: 'Ringkasan', href: '/remed/hr/dashboard' },
      { title: 'Review', href: '/remed/hr/claims' },
      { title: 'Riwayat', href: '/remed/hr/history' },
      { title: 'Plafond', href: '/remed/hr/employees' },
      { title: 'Akses', href: '/remed/hr/access' },
      { title: 'Laporan', href: '/remed/hr/reports' },
      { title: 'Tanda Tangan', href: '/remed/hr/signatures' },
    ] },
    { title: 'Sistem', prefixes: ['/hr/settings'], tabs: [
      { title: 'Pengaturan', href: '/hr/settings' },
      { title: 'Notifikasi', href: '/hr/settings/notifications' },
      { title: 'System Health', href: '/hr/settings/system-health' },
    ] },
  ],
  employee: [
    { title: 'Pengajuan', prefixes: ['/employee/leave', '/employee/phl', '/employee/requests'], tabs: [
      { title: 'Cuti & Izin', href: '/employee/leave' },
      { title: 'Saldo PHL', href: '/employee/phl' },
      { title: 'Postpone', href: '/employee/leave/postpone' },
    ] },
    { title: 'Approval Tim', prefixes: ['/employee/approvals'], tabs: [
      { title: 'Ringkasan', href: '/employee/approvals' },
      { title: 'Absensi', href: '/employee/approvals/attendance' },
      { title: 'Cuti & Izin', href: '/employee/approvals/leave' },
      { title: 'PHL', href: '/employee/approvals/phl' },
      { title: 'Postpone', href: '/employee/approvals/leave/postpone' },
    ] },
    { title: 'Re-Med', prefixes: ['/remed/employee'], tabs: [
      { title: 'Ringkasan', href: '/remed/employee/dashboard' },
      { title: 'Ajukan Klaim', href: '/remed/employee/claims/new' },
      { title: 'Klaim Saya', href: '/remed/employee/claims' },
      { title: 'Riwayat', href: '/remed/employee/history' },
      { title: 'Tanda Tangan', href: '/remed/employee/account' },
    ] },
  ],
}
export function resolveModule(role: NavigationRole, pathname: string): ModuleNavigation | null {
  if (role === 'finance') return null // Finance already has only five focused sections.
  return modules[role].find(item => item.prefixes.some(prefix => routeMatches(pathname, prefix))) || null
}
export function resolveDetailTabs(role: NavigationRole, pathname: string): NavigationTab[] {
  if (role !== 'hr') return []
  if (routeMatches(pathname, '/hr/attendance')) return [
    { title: 'Ringkasan', href: '/hr/attendance' },
    { title: 'Upload', href: '/hr/attendance/upload' },
    { title: 'Data & Review', href: '/hr/attendance/data', activePrefixes: ['/hr/attendance/data', '/hr/attendance/approvals'] },
    { title: 'Laporan', href: '/hr/attendance/final-report' },
    { title: 'Export', href: '/hr/attendance/export' },
    { title: 'Sync', href: '/hr/attendance/sync' },
    { title: 'Audit', href: '/hr/attendance/audit' },
  ]
  if (routeMatches(pathname, '/hr/leave')) return [
    { title: 'Ringkasan', href: '/hr/leave' },
    { title: 'Administrasi', href: '/hr/leave/administration' },
    { title: 'Siklus Cuti', href: '/hr/leave/cycles' },
    { title: 'Postpone', href: '/hr/leave/postpone' },
  ]
  if (routeMatches(pathname, '/hr/phl')) return [
    { title: 'Pengajuan', href: '/hr/phl' },
    { title: 'Saldo', href: '/hr/phl/balance' },
  ]
  return []
}
