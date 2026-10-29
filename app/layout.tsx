import type { Metadata } from 'next'
import './globals.css'
import './theme-normalization.css'
import './contrast-hardening.css'
import './employee-master-contrast.css'
import { SystemMaintenanceGate } from '@/components/system/SystemMaintenanceGate'
import { HarmonyThemeProvider } from '@/components/theme/ThemeProvider'

export const metadata: Metadata = {
  title: {
    default: 'HARMONY',
    template: '%s | HARMONY',
  },
  description: 'Human Attendance, Request, Monitoring & Leave System',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><HarmonyThemeProvider><SystemMaintenanceGate>{children}</SystemMaintenanceGate></HarmonyThemeProvider></body>
    </html>
  )
}
