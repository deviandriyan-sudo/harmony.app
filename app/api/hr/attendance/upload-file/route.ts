import { scannedSignedUrl } from '@/lib/server/private-evidence'
import { NextRequest, NextResponse } from 'next/server'
import { apiError, requireHRApi } from '@/lib/server/hr-api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireHRApi(request)
    const id = request.nextUrl.searchParams.get('id') || ''
    if (!/^[0-9a-f-]{32,36}$/i.test(id)) {
      return NextResponse.json({ message: 'ID unggahan tidak valid.' }, { status: 400 })
    }
    const { data: upload, error } = await admin.from('attendance_uploads')
      .select('file_path,deleted_at')
      .eq('id', id).maybeSingle()
    if (error || !upload || upload.deleted_at || !upload.file_path) {
      return NextResponse.json({ message: 'File upload tidak tersedia.' }, { status: 404 })
    }
    const url = await scannedSignedUrl(admin,'attendance-uploads',upload.file_path)
    if (!url) return NextResponse.json({ message: 'Berkas belum lolos pemeriksaan keamanan.' }, { status: 503 })
    return NextResponse.json({ url },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const details = apiError(error)
    return NextResponse.json({ message: details.message }, { status: details.status })
  }
}
