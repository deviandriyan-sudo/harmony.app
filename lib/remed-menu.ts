import {
  BadgeDollarSign,
  Banknote,
  ClipboardCheck,
  FileClock,
  FilePlus2,
  Files,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
  WalletCards,
} from 'lucide-react'

export const remedEmployeeMenu = [
  { title: 'Beranda', href: '/remed/employee/dashboard', icon: LayoutDashboard, subtitle: 'Plafond & klaim' },
  { title: 'Ajukan Klaim', href: '/remed/employee/claims/new', icon: FilePlus2, subtitle: 'Reimbursement baru' },
  { title: 'Klaim Saya', href: '/remed/employee/claims', icon: Files, subtitle: 'Status pengajuan' },
  { title: 'Riwayat', href: '/remed/employee/history', icon: FileClock, subtitle: 'Klaim selesai' },
  { title: 'Akun', href: '/remed/employee/account', icon: Settings, subtitle: 'Akun & akses' },
]

export const remedHrMenu = [
  { title: 'Beranda HR', href: '/remed/hr/dashboard', icon: LayoutDashboard, subtitle: 'Ringkasan Re-Med' },
  { title: 'Review Klaim', href: '/remed/hr/claims', icon: ClipboardCheck, subtitle: 'Approve / reject' },
  { title: 'Plafond Karyawan', href: '/remed/hr/employees', icon: WalletCards, subtitle: 'Entitlement tahunan' },
  { title: 'Akses Re-Med', href: '/remed/hr/access', icon: UserCog, subtitle: 'Employee, HR & Finance' },
  { title: 'Laporan', href: '/remed/hr/reports', icon: BadgeDollarSign, subtitle: 'Rekap reimbursement' },
]

export const remedFinanceMenu = [
  { title: 'Beranda Finance', href: '/remed/finance/dashboard', icon: LayoutDashboard, subtitle: 'Ringkasan pembayaran' },
  { title: 'Review Finance', href: '/remed/finance/claims', icon: ClipboardCheck, subtitle: 'Approve / reject' },
  { title: 'Pembayaran', href: '/remed/finance/payments', icon: Banknote, subtitle: 'Upload bukti bayar' },
  { title: 'Riwayat', href: '/remed/finance/history', icon: FileClock, subtitle: 'Klaim dibayar' },
  { title: 'Akses', href: '/remed/finance/access', icon: Users, subtitle: 'Profil Finance' },
]
