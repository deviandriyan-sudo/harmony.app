import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    const { data, error } = await ctx.admin
      .from('remed_claim_types')
      .select('id,code,name,description,is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ claimTypes: data || [] })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
