import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'
import { enrichRemedClaims } from '@/lib/server/remed-data'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr', 'finance'])
    const { data, error } = await ctx.admin.from('remed_claims').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ claims: await enrichRemedClaims(ctx.admin, data || []) })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
