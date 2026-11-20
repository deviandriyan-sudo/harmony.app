import type { Metadata } from 'next'
import './globals.css'
import './theme-normalization.css'
import './contrast-hardening.css'
import './employee-master-contrast.css'
import './remed-payment-print.css'
import './theme-contrast-rc2n.css'
import './harmony-compact-rc2o.css'
import { SystemMaintenanceGate } from '@/components/system/SystemMaintenanceGate'
import { HarmonyThemeProvider } from '@/components/theme/ThemeProvider'
import { HarmonyModalFeedbackLayer } from '@/components/ui/HarmonyModalFeedbackLayer'

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
      <body className="min-h-full flex flex-col"><HarmonyThemeProvider><SystemMaintenanceGate>{children}</SystemMaintenanceGate><HarmonyModalFeedbackLayer /></HarmonyThemeProvider></body>
    </html>
  )
}
