import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validEvidenceObjectPath } from '@/lib/evidence-url'
import { MAX_SCAN_BYTES, inspectUploadBytes, type AcceptedUploadVerdict } from '@/lib/server/malware-scan'
import { validUploadContent, validAttendanceImportContent, uploadExtension } from '@/lib/server/upload-validation'

export async function recordVerifiedEvidence(admin:SupabaseClient,bucket:string,path:string,owner:string|null,bytes:Uint8Array,verdict:AcceptedUploadVerdict) {
  const result = await admin.rpc('harmony_file_security_record_v1',{p_bucket:bucket,p_path:path,p_owner_employee_id:owner,p_sha256:createHash('sha256').update(bytes).digest('hex'),p_verdict:verdict,p_source:verdict==='clean'?'verified_upload':'validated_upload'})
  if(result.error||result.data!==true)throw new Error('File tersimpan, tetapi pencatatan keamanan gagal. Hubungi HR.')
}

/** Never sign solely because a browser-written parent contains an object URL. */
export async function verifiedEvidenceOwner(admin:SupabaseClient,bucket:string,path:string,owner:string) {
  if(!validEvidenceObjectPath(path)||!['leave-attachments','phl-proofs'].includes(bucket)||!owner)return false
  const check=await admin.rpc('harmony_file_security_owned_v1',{p_bucket:bucket,p_path:path,p_owner_employee_id:owner})
  return !check.error&&check.data===true
}

/** Historical file bytes require a live scan in required mode, or validated deferred metadata in phase 1.
 * After cutover, objects are immutable to browser clients; no direct Storage read bypass. */
export async function readCheckedEvidenceBytes(admin:SupabaseClient,bucket:string,path:string,filename?:string, reportStorageFailure=false) {
  if(!validEvidenceObjectPath(path)||!['leave-attachments','phl-proofs','attendance-uploads','harmony-employee-private','remed-private','remed-signatures','scaleup-private'].includes(bucket))return null
  const stored=await admin.storage.from(bucket).download(path)
  if(stored.error||!stored.data) {
    if(reportStorageFailure) {
      const status=Number(stored.error?.statusCode || 0)
      const missing=status===404 || /not found|nosuchkey/i.test(stored.error?.message || '')
      throw Object.assign(new Error(missing ? 'File evidence tidak ditemukan di Supabase Storage. Minta HR memulihkan dokumen asli; status PHL tidak berubah.' : 'Supabase Storage belum dapat membuka evidence. Coba lagi atau hubungi HR.'), {status:missing?404:503})
    }
    return null
  }
  if(stored.data.size<1||stored.data.size>MAX_SCAN_BYTES)return null
  const bytes=new Uint8Array(await stored.data.arrayBuffer())
  const verdict=await inspectUploadBytes(bytes)
  // In the explicitly deferred phase retain strict format checks. Existing
  // avatar/signature images may render only from the separate Storage origin.
  const leaf=path.split('/').pop() || ''
  const name=filename || leaf
  if(verdict==='deferred' && !(bucket==='attendance-uploads' ? validAttendanceImportContent(name,bytes) : validUploadContent(name,bytes)))return null
  const event=await admin.rpc('harmony_file_security_record_v1',{p_bucket:bucket,p_path:path,p_owner_employee_id:null,p_sha256:createHash('sha256').update(bytes).digest('hex'),p_verdict:verdict,p_source:'historical_scan'})
  if(event.error||event.data!==true||(verdict!=='clean'&&verdict!=='deferred'))return null
  return { bytes, verdict }
}

export async function scannedSignedUrl(admin:SupabaseClient,bucket:string,path:string,filename?:string,expiresIn=60) {
  const checked=await readCheckedEvidenceBytes(admin,bucket,path,filename)
  if(!checked)return null
  const {verdict}=checked
  const leaf=path.split('/').pop() || ''
  // Only signature images keep their existing ten-minute print window; other documents use 60 seconds.
  const ttl=bucket==='remed-signatures'?Math.max(1,Math.min(600,Math.floor(expiresIn)||60)):60
  const inlineImage=(bucket==='remed-signatures'||bucket==='harmony-employee-private')&&!filename&&['jpg','jpeg','png','webp'].includes(uploadExtension(leaf))
  const downloadName=filename || (verdict==='deferred'&&!inlineImage?leaf:undefined)
  const signed=await admin.storage.from(bucket).createSignedUrl(path,ttl,downloadName?{download:downloadName.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,160)}:{})
  return !signed.error&&signed.data?.signedUrl?signed.data.signedUrl:null
}
