import type { Metadata } from 'next'
import './globals.css'
import './theme-normalization.css'
import './contrast-hardening.css'
import './employee-master-contrast.css'
import './remed-payment-print.css'
import './theme-contrast-rc2n.css'
import './harmony-compact-rc2o.css'
import './harmony-rc2q-employee-attendance.css'
import './harmony-rc2r-design-system.css'
import './harmony-rc2z-liquid-glass.css'
import './harmony-rc2ze-attendance-composition.css'
import './harmony-rc3a-light-refinement.css'
import './harmony-rc2zh-attendance-verification.css'
import { SystemMaintenanceGate } from '@/components/system/SystemMaintenanceGate'
import { HarmonyThemeProvider } from '@/components/theme/ThemeProvider'
import { HarmonyMaterialLight } from '@/components/theme/HarmonyMaterialLight'
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
      data-harmony-theme-preference="light"
      data-harmony-theme="light"
      lang="id"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><HarmonyThemeProvider><HarmonyMaterialLight /><SystemMaintenanceGate>{children}</SystemMaintenanceGate><HarmonyModalFeedbackLayer /></HarmonyThemeProvider></body>
    </html>
  )
}
