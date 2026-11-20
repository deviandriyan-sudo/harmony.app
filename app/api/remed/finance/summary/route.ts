import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { witaToday } from '@/lib/dashboard-monitoring'

export const dynamic = 'force-dynamic'
/** Finance-only optional read-only supplement to existing /api/remed/dashboard. */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    if (ctx.access.role !== 'finance') return NextResponse.json({message:'Akses Finance diperlukan.'},{status:403})
    const now = new Date(`${witaToday()}T00:00:00Z`)
    const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-01`
    const next = now.getUTCMonth() === 11
      ? `${now.getUTCFullYear()+1}-01-01`
      : `${now.getUTCFullYear()}-${String(now.getUTCMonth()+2).padStart(2,'0')}-01`
    const LIMIT=500
    const [review,payment,followup,periodPaid] = await Promise.all([
      ctx.admin.from('remed_claims').select('id',{count:'exact',head:true}).eq('status','pending_finance'),
      ctx.admin.from('remed_claims').select('id',{count:'exact',head:true}).eq('status','waiting_payment'),
      ctx.admin.from('remed_claims').select('id',{count:'exact',head:true}).eq('status','rejected_finance'),
      ctx.admin.from('remed_claims').select('approved_amount,submitted_amount',{count:'exact'}).eq('status','paid').gte('payment_date',start).lt('payment_date',next).order('id',{ascending:true}).range(0,LIMIT-1),
    ])
    for (const result of [review,payment,followup,periodPaid]) if (result.error) throw result.error
    let periodPaidTotal=0
    const sum = (rows: {approved_amount:number|null;submitted_amount:number|null}[]) => {
      for(const row of rows) periodPaidTotal += Number(row.approved_amount || row.submitted_amount || 0)
    }
    sum(periodPaid.data||[])
    for(let offset=LIMIT;offset<(periodPaid.count||0);offset+=LIMIT) {
      const page=await ctx.admin.from('remed_claims').select('approved_amount,submitted_amount')
        .eq('status','paid').gte('payment_date',start).lt('payment_date',next)
        .order('id',{ascending:true}).range(offset,offset+LIMIT-1)
      if(page.error)throw page.error
      sum(page.data||[])
    }
    return NextResponse.json({review:review.count||0,waitingPayment:payment.count||0,followup:followup.count||0,periodPaidTotal},{headers:{'Cache-Control':'private, no-store'}})
  } catch(error) {
    const issue=remedApiError(error)
    return NextResponse.json({message:issue.message},{status:issue.status})
  }
}
