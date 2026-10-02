import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request, ['hr', 'finance'])
    const rawLimit = Number(new URL(request.url).searchParams.get('limit') || 500)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 1000) : 500

    const { data, error } = await ctx.admin.rpc('remed_get_process_history_v2', {
      p_actor_auth_user_id: ctx.authUserId,
      p_limit: limit,
    })
    if (error) throw Object.assign(new Error(error.message), { status: 400 })

    return NextResponse.json({ history: data || [] })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
