import {
  CalendarDays,
  Clock3,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  Settings,
  UserCheck,
  Users,
  WalletCards,
} from 'lucide-react'

export const hrMenu = [
  {
    section: 'HARMONY',
    title: 'Beranda HR',
    href: '/hr/dashboard',
    icon: LayoutDashboard,
    subtitle: 'Overview sistem',
  },
  {
    section: 'HARMONY',
    title: 'Data Karyawan',
    href: '/hr/employees',
    icon: Users,
    subtitle: 'Master employee',
  },
  {
    section: 'HARMONY',
    title: 'Absensi',
    href: '/hr/attendance',
    icon: Clock3,
    subtitle: 'Upload, rekap & laporan',
  },
  {
    section: 'HARMONY',
    title: 'Cuti & Izin',
    href: '/hr/leave',
    icon: CalendarDays,
    subtitle: 'Cuti, izin & postpone',
  },
  {
    section: 'HARMONY',
    title: 'PHL',
    href: '/hr/phl',
    icon: WalletCards,
    subtitle: 'Monitoring PHL & saldo',
  },
  {
    section: 'HARMONY',
    title: 'Kalender Libur',
    href: '/hr/holidays',
    icon: Landmark,
    subtitle: 'Libur nasional & perusahaan',
  },
  {
    section: 'HARMONY',
    title: 'Pengaturan',
    href: '/hr/settings',
    icon: Settings,
    subtitle: 'Akun & sistem',
  },
]

export const employeeMenu = [
  {
    section: 'HARMONY',
    title: 'Beranda',
    href: '/employee/dashboard',
    icon: LayoutDashboard,
    subtitle: 'Overview employee',
  },
  {
    section: 'HARMONY',
    title: 'Absensi',
    href: '/employee/attendance',
    icon: Clock3,
    subtitle: 'Riwayat kehadiran',
  },
  {
    section: 'HARMONY',
    title: 'Cuti & Izin',
    href: '/employee/leave',
    icon: CalendarDays,
    subtitle: 'Cuti, izin & klaim saldo PHL',
  },
  {
    section: 'HARMONY',
    title: 'Saldo PHL',
    href: '/employee/phl',
    icon: WalletCards,
    subtitle: 'Ajukan saldo dari pekerjaan PHL',
  },
  {
    section: 'HARMONY',
    title: 'Approval Tim',
    href: '/employee/approvals',
    icon: UserCheck,
    subtitle: 'Approval bawahan',
  },
  {
    section: 'HARMONY',
    title: 'Pengaturan',
    href: '/employee/settings',
    icon: Settings,
    subtitle: 'Profil & password',
  },
]

export const employeeRemedEntry = {
  section: 'RE-MED',
  title: 'Medical Reimbursement',
  href: '/remed/employee/dashboard',
  icon: HeartPulse,
  subtitle: 'Plafond, klaim & riwayat',
}

export const hrRemedEntry = {
  section: 'RE-MED',
  title: 'Medical Reimbursement',
  href: '/remed/hr/dashboard',
  icon: HeartPulse,
  subtitle: 'Review, plafond & laporan',
}
