import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { getRemedDashboardTotals } from '@/lib/server/remed-dashboard-totals'

export const dynamic = 'force-dynamic'
/** Finance-only optional read-only supplement to existing /api/remed/dashboard. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    if (ctx.access.role !== 'finance') return NextResponse.json({message:'Akses Finance diperlukan.'},{status:403})
    const totals = await getRemedDashboardTotals(ctx.admin)
    return NextResponse.json(totals.financeSummary,{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    const issue=remedApiError(error)
    return NextResponse.json({message:issue.message},{status:issue.status})
  }
}
