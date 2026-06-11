import {
  LayoutDashboard,
  Users,
  UserCheck,
  Clock3,
  CalendarDays,
  Landmark,
  Settings,
} from 'lucide-react'

export const hrMenu = [
  {
    title: 'Beranda HR',
    href: '/hr/dashboard',
    icon: LayoutDashboard,
    subtitle: 'Overview sistem',
  },
  {
    title: 'Data Karyawan',
    href: '/hr/employees',
    icon: Users,
    subtitle: 'Master employee',
  },
  {
    title: 'Absensi',
    href: '/hr/attendance',
    icon: Clock3,
    subtitle: 'Upload, rekap & laporan',
  },
  {
    title: 'Cuti & Izin',
    href: '/hr/leave',
    icon: CalendarDays,
    subtitle: 'Cuti, izin, PHL & postpone',
  },
  {
    title: 'Kalender Libur',
    href: '/hr/holidays',
    icon: Landmark,
    subtitle: 'Libur nasional & perusahaan',
  },
  {
    title: 'Pengaturan',
    href: '/hr/settings',
    icon: Settings,
    subtitle: 'Akun & sistem',
  },
]

export const employeeMenu = [
  {
    title: 'Beranda',
    href: '/employee/dashboard',
    icon: LayoutDashboard,
    subtitle: 'Overview employee',
  },
  {
    title: 'Absensi',
    href: '/employee/attendance',
    icon: Clock3,
    subtitle: 'Riwayat kehadiran',
  },
  {
    title: 'Cuti & Izin',
    href: '/employee/leave',
    icon: CalendarDays,
    subtitle: 'Cuti, izin, PHL & postpone',
  },
  {
    title: 'Approval Tim',
    href: '/employee/approvals',
    icon: UserCheck,
    subtitle: 'Approval bawahan',
  },
  {
    title: 'Pengaturan',
    href: '/employee/settings',
    icon: Settings,
    subtitle: 'Profil & password',
  },
]