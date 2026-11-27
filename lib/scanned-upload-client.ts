'use client'
import { harmonyFetch } from '@/lib/harmony-client'
import { supabase } from '@/lib/supabase'
type Purpose = 'evidence' | 'fingerprint'
type Accepted = {ticket:string;sha256:string;security_status:'clean'|'deferred'}
const staging = 'harmony-upload-quarantine'
const cache = new WeakMap<File, Promise<Accepted>>()
async function stage(file:File,purpose:Purpose):Promise<Accepted> {
  const ticket = await harmonyFetch<{ticket:string;path:string;token:string}>('/api/security/upload',{method:'POST',body:JSON.stringify({action:'ticket',purpose,name:file.name,size:file.size,mime:file.type})})
  const upload = await supabase.storage.from(staging).uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:'application/octet-stream',upsert:false})
  if(upload.error)throw new Error('Gagal mengirim file ke karantina.')
  const checked = await harmonyFetch<{sha256:string;security_status:'clean'|'deferred'}>('/api/security/upload',{method:'POST',body:JSON.stringify({action:'scan',ticket:ticket.ticket})})
  const hash = await crypto.subtle.digest('SHA-256',await file.arrayBuffer())
  const local = Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('')
  if(local!==checked.sha256)throw new Error('Isi file berbeda dari file yang diperiksa.')
  if (!['clean','deferred'].includes(checked.security_status)) throw new Error('Status pemeriksaan file tidak dikenal.')
  return {ticket:ticket.ticket,sha256:local,security_status:checked.security_status}
}
export async function ensureFingerprintScanned(file:File) {
  let pending = cache.get(file)
  if(!pending){pending=stage(file,'fingerprint');cache.set(file,pending)}
  try{return await pending}catch(error){cache.delete(file);throw error}
}
export async function publishScannedUpload(file:File,purpose:Purpose) {
  const verified=purpose==='fingerprint'?await ensureFingerprintScanned(file):await stage(file,purpose)
  return harmonyFetch<{path:string;referenceUrl:string;sha256:string;mime:string;security_status:'clean'|'deferred'}>('/api/security/upload',{method:'POST',body:JSON.stringify({action:'publish',...verified})})
}
