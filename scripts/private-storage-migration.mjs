/** Explicit operator cutover tool. Default is READ ONLY. Never removes objects. */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key)throw Error('Secure runtime credentials required; never place service role key in public code.')
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const publicIds=['leave-attachments','phl-proofs']
const quarantine='harmony-upload-quarantine'
const {data:buckets,error}=await client.storage.listBuckets()
if(error)throw Error('Storage bucket inventory unavailable.')
const inventory=new Map(buckets.map(b=>[b.id,b]))
for(const id of publicIds)if(!inventory.has(id))throw Error('Expected bucket missing: '+id)
console.log(JSON.stringify(buckets.map(b=>({id:b.id,public:b.public,file_size_limit:b.file_size_limit})),null,2))
const mode=process.argv[2]||'--plan'
// This script reads server credentials from the process, never prints them.
if(mode==='--prepare'){
 if(inventory.has(quarantine)){
   if(inventory.get(quarantine).public||inventory.get(quarantine).file_size_limit!==10485760)throw Error('Quarantine configuration mismatch; do not overwrite blindly.')
 }else{
   const created=await client.storage.createBucket(quarantine,{public:false,fileSizeLimit:10485760,allowedMimeTypes:['application/octet-stream']})
   if(created.error)throw Error('Quarantine provisioning failed.')
 }
 const verified=await client.storage.getBucket(quarantine)
 if(verified.error||verified.data?.public!==false||verified.data.file_size_limit!==10485760||!Array.isArray(verified.data.allowed_mime_types)||verified.data.allowed_mime_types.length!==1||verified.data.allowed_mime_types[0]!=='application/octet-stream')throw Error('Quarantine postcheck failed.')
 console.log('Quarantine preparation PASS; private, 10 MiB, octet-stream only. No existing bucket visibility changed.')
}else if(mode==='--cutover'){
 if(process.env.HARMONY_STORAGE_CUTOVER_APPROVED!=='true'||!process.argv[3])throw Error('Explicit approved gate report required.')
 const gate=JSON.parse(readFileSync(process.argv[3],'utf8'))
 const scannerMode=(process.env.HARMONY_SCAN_URL||process.env.HARMONY_SCAN_TOKEN||(process.env.HARMONY_SCAN_MODE&&process.env.HARMONY_SCAN_MODE!=='deferred'))?'required':'deferred'
 if(gate.scannerMode!==scannerMode)throw Error('Scanner policy in gate differs from runtime configuration.')
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()
 if(gate.commit!==head||gate.productionSourceVerified!==true||gate.buildPass!==true||gate.roleE2EPass!==true||gate.backupVerified!==true||gate.directStoragePoliciesBlocked!==true||(gate.scannerMode==='deferred'?gate.malwareDeferralAccepted!==true:gate.liveScannerPass!==true||gate.unscannedAccessibleObjects!==0)||gate.inventoryVerified!==true||gate.unresolvedEvidenceOwners!==0||!Number.isSafeInteger(gate.inventoryObjectCount)||gate.inventoryObjectCount<1||Date.now()-Date.parse(gate.verifiedAt)>3600000||Date.parse(gate.verifiedAt)>Date.now()||!Number.isFinite(Date.parse(gate.verifiedAt)))throw Error('Release gate incomplete. No cutover performed.')
 if(!inventory.has(quarantine)||inventory.get(quarantine).public)throw Error('Private quarantine is absent.')
 for(const id of publicIds){
   const b=inventory.get(id)
   if(!b.public)continue
   const updated=await client.storage.updateBucket(id,{public:false,fileSizeLimit:10485760,allowedMimeTypes:['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/octet-stream']})
   if(updated.error)throw Error('Bucket cutover stopped at '+id+'; inspect actual state, do not reopen previous bucket automatically.')
   const check=await client.storage.getBucket(id)
   if(check.error||check.data?.public!==false)throw Error('Bucket postcheck failed: '+id)
 }
 console.log('Private bucket flags verified. Confirm unsigned access denial and authenticated signed read externally.')
}else if(mode!=='--plan')throw Error('Unknown mode.')
