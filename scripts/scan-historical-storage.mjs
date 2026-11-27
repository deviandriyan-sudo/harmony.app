/** Inventory and optionally scan existing objects. Requires a private approved scanner.
 * Run with Node 22+ --experimental-strip-types. No file content, paths or keys logged.
 * This does not establish ownership or delete, copy, move or publish any object. */
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { scanUploadBytes, MAX_SCAN_BYTES } from '../lib/server/malware-scan.ts'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
const mode=process.argv[2]||'--plan'
if(!['--plan','--execute'].includes(mode)||!url||!key)throw Error('Invalid mode or secure service credentials unavailable.')
if(mode==='--execute'){
 const target=new URL(process.env.HARMONY_SCAN_URL||'')
 if(process.env.HARMONY_HISTORICAL_SCAN_APPROVED!=='true'||target.protocol!=='https:'||target.pathname!=='/scan'||target.username||target.password||target.search||target.hash||(process.env.HARMONY_SCAN_TOKEN||'').length<32)throw Error('Approved private scanner is required.')
}
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:buckets,error}=await client.storage.listBuckets()
if(error)throw Error('Bucket inventory unavailable.')
const approved=new Set(['attendance-uploads','harmony-employee-private','leave-attachments','phl-proofs','remed-private','remed-signatures','scaleup-private','harmony-upload-quarantine'])
const totals={objects:0,clean:0,blocked:0,unavailable:0,oversize:0,metadataErrors:0}
async function walk(bucket,prefix='',depth=0){
 if(depth>32)throw Error('Inventory depth limit exceeded.')
 const pageSize=100
 for(let offset=0;;offset+=pageSize){
  const result=await client.storage.from(bucket).list(prefix,{limit:pageSize,offset,sortBy:{column:'name',order:'asc'}})
  if(result.error||!result.data)throw Error('Inventory listing failed.')
  for(const row of result.data){
   const path=prefix?`${prefix}/${row.name}`:row.name
   if(!row.id){await walk(bucket,path,depth+1);continue}
   totals.objects++
   if(mode!=='--execute')continue
   const size=Number(row.metadata?.size)
   if(!Number.isFinite(size)||size<1||size>MAX_SCAN_BYTES){totals.oversize++;continue}
   const file=await client.storage.from(bucket).download(path)
   if(file.error||!file.data||file.data.size!==size||file.data.size>MAX_SCAN_BYTES){totals.unavailable++;continue}
   const bytes=new Uint8Array(await file.data.arrayBuffer())
   const verdict=await scanUploadBytes(bytes)
   totals[verdict]++
   const event=await client.rpc('harmony_file_security_record_v1',{p_bucket:bucket,p_path:path,p_owner_employee_id:null,p_sha256:createHash('sha256').update(bytes).digest('hex'),p_verdict:verdict,p_source:'historical_scan'})
   if(event.error||event.data!==true)totals.metadataErrors++
  }
  if(result.data.length<pageSize)break
 }
}
for(const bucket of buckets){if(approved.has(bucket.id))await walk(bucket.id)}
console.log(JSON.stringify({mode,...totals},null,2))
if(mode==='--execute'&&(totals.blocked||totals.unavailable||totals.oversize||totals.metadataErrors))process.exitCode=2
