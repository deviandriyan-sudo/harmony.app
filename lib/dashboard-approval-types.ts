export type DashboardApprovalItem = {
  id: string
  recordId: string
  employeeId: string
  kind: 'attendance' | 'leave' | 'work' | 'claim'
  name: string
  category: string
  date: string
  href: string
  status: string
  description: string
  extra?: string
  canApprove: boolean
  canReject: boolean
  requiresHr: boolean
  attachments?: { id: string; fileName: string }[]
}

export type DashboardApprovalSummary = {
  items: DashboardApprovalItem[]
  total: number
  actionableTotal: number
  blockedTotal: number
}
