import {
  BadgeDollarSign,
  Banknote,
  ClipboardCheck,
  FileClock,
  History,
  FilePlus2,
  Files,
  LayoutDashboard,
  PenLine,
  UserCog,
  Users,
  WalletCards,
} from 'lucide-react'

export const remedEmployeeMenu = [
  { section: 'RE-MED', title: 'Dashboard Re-Med', href: '/remed/employee/dashboard', icon: LayoutDashboard, subtitle: 'Plafond & klaim' },
  { section: 'RE-MED', title: 'Ajukan Klaim', href: '/remed/employee/claims/new', icon: FilePlus2, subtitle: 'Reimbursement baru' },
  { section: 'RE-MED', title: 'Klaim Saya', href: '/remed/employee/claims', icon: Files, subtitle: 'Status pengajuan' },
  { section: 'RE-MED', title: 'Riwayat Klaim', href: '/remed/employee/history', icon: FileClock, subtitle: 'Klaim selesai' },
  { section: 'RE-MED', title: 'Akun & Tanda Tangan', href: '/remed/employee/account', icon: PenLine, subtitle: 'Kelola tanda tangan' },
]

export const remedHrMenu = [
  { section: 'RE-MED', title: 'Dashboard Re-Med', href: '/remed/hr/dashboard', icon: LayoutDashboard, subtitle: 'Ringkasan reimbursement' },
  { section: 'RE-MED', title: 'Review Klaim', href: '/remed/hr/claims', icon: ClipboardCheck, subtitle: 'Approve / reject' },
  { section: 'RE-MED', title: 'Riwayat Proses', href: '/remed/hr/history', icon: History, subtitle: 'Approval, reject & alasan' },
  { section: 'RE-MED', title: 'Plafond Karyawan', href: '/remed/hr/employees', icon: WalletCards, subtitle: 'Entitlement tahunan' },
  { section: 'RE-MED', title: 'Akses Re-Med', href: '/remed/hr/access', icon: UserCog, subtitle: 'Employee, HR & Finance' },
  { section: 'RE-MED', title: 'Manajemen Tanda Tangan', href: '/remed/hr/signatures', icon: PenLine, subtitle: 'HR, Finance & karyawan' },
  { section: 'RE-MED', title: 'Laporan Re-Med', href: '/remed/hr/reports', icon: BadgeDollarSign, subtitle: 'Rekap reimbursement' },
]

export const remedFinanceMenu = [
  { section: 'RE-MED', title: 'Dashboard Finance', href: '/remed/finance/dashboard', icon: LayoutDashboard, subtitle: 'Ringkasan pembayaran' },
  { section: 'RE-MED', title: 'Review Finance', href: '/remed/finance/claims', icon: ClipboardCheck, subtitle: 'Approve / reject' },
  { section: 'RE-MED', title: 'Pembayaran', href: '/remed/finance/payments', icon: Banknote, subtitle: 'Upload bukti bayar' },
  { section: 'RE-MED', title: 'Riwayat Proses', href: '/remed/finance/history', icon: History, subtitle: 'Approval, reject & alasan' },
  { section: 'RE-MED', title: 'Akun & Keamanan', href: '/remed/finance/access', icon: Users, subtitle: 'Profil & password' },
]
