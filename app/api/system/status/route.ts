import { NextRequest, NextResponse } from 'next/server'

import { apiError, requireHRApi } from '@/lib/server/hr-api-auth'
import { getHarmonySystemControl } from '@/lib/server/system-control'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const control = await getHarmonySystemControl(supabaseAdmin)
  return NextResponse.json(control, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const { admin, actor } = await requireHRApi(request)
    const body = await request.json().catch(() => ({}))
    const systemEnabled = body?.systemEnabled

    if (typeof systemEnabled !== 'boolean') {
      return NextResponse.json({ message: 'Status sistem wajib berupa boolean.' }, { status: 400 })
    }

    const current = await getHarmonySystemControl(admin)
    if (!current.configured) {
      return NextResponse.json(
        { message: 'System Control belum tersedia. Jalankan SQL migration HARMONY V3.5.0 terlebih dahulu.' },
        { status: 409 },
      )
    }

    const maintenanceMessage = String(
      body?.maintenanceMessage || current.maintenanceMessage,
    ).trim()

    const { error } = await admin
      .from('harmony_system_controls')
      .update({
        system_enabled: systemEnabled,
        maintenance_message: maintenanceMessage || current.maintenanceMessage,
        updated_at: new Date().toISOString(),
        updated_by: actor.id,
        updated_by_email: actor.email,
      })
      .eq('id', 'main')

    if (error) throw error

    const updated = await getHarmonySystemControl(admin)
    return NextResponse.json({
      ...updated,
      message: systemEnabled
        ? 'HARMONY aktif. Akses user dan pengiriman email kembali diaktifkan.'
        : 'Maintenance aktif. Akses Employee/Finance dan seluruh pengiriman email HARMONY dihentikan sementara.',
    })
  } catch (error) {
    const issue = apiError(error, 'Gagal mengubah status HARMONY.')
    return NextResponse.json({ message: issue.message }, { status: issue.status })
  }
}
