import { NextRequest, NextResponse } from 'next/server'
import { requireRemedApi, remedApiError } from '@/lib/server/remed-api-auth'

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireRemedApi(request)
    const userName =
      ctx.employee?.full_name ||
      ctx.access.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

    return NextResponse.json({
      session: {
        accessId: ctx.access.id,
        role: ctx.access.role,
        email: ctx.access.email,
        authUserId: ctx.authUserId,
        employeeId: ctx.access.employee_id,
        userName,
        isActive: ctx.access.is_active,
      },
    })
  } catch (error) {
    const issue = remedApiError(error)
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
