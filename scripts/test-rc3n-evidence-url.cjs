/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../lib/evidence-url.ts'), 'utf8')
const mod = { exports: {} }
new Function('exports','module',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod)
const { parseLegacyEvidenceUrl, validEvidenceObjectPath } = mod.exports
const origin = 'https://example.supabase.co'
const prefix = `${origin}/storage/v1/object/public/leave-attachments/`
assert.equal(parseLegacyEvidenceUrl(prefix+'draft/abc.pdf', origin).path,'draft/abc.pdf')
assert.equal(parseLegacyEvidenceUrl(prefix+'draft/abc%20def.pdf',origin).path,'draft/abc def.pdf')
assert.equal(parseLegacyEvidenceUrl(`${origin}/storage/v1/object/public/phl-proofs/a.pdf`,origin).bucket,'phl-proofs')
for(const v of [null, '', 'javascript:alert(1)', 'https://external.example/a.pdf', prefix+'../secret.pdf', prefix+'%2e%2e/secret.pdf', prefix+'draft%2fsecret.pdf', prefix+'draft%5csecret.pdf', prefix+'draft/%252e%252e/x.pdf', prefix+'draft//x.pdf', prefix+'draft/a.pdf?token=other', prefix+'draft/a.pdf#fragment', prefix+'draft/%00x.pdf', prefix+'draft\\x.pdf', `${origin}/storage/v1/object/public/other-bucket/x.pdf`, 'https://example.supabase.co.evil.example/storage/v1/object/public/leave-attachments/x.pdf', 'https://user@example.supabase.co/storage/v1/object/public/leave-attachments/x.pdf']) assert.equal(parseLegacyEvidenceUrl(v,origin),null,String(v))
for(const v of ['', '/a.pdf','a/../b.pdf','a//b.pdf','a%2fb.pdf','a\\b.pdf']) assert.equal(validEvidenceObjectPath(v),false,v)
assert.equal(parseLegacyEvidenceUrl(prefix+'a.pdf',undefined),null)
const api=fs.readFileSync(path.join(__dirname,'../app/api/attachments/route.ts'),'utf8')
const view=fs.readFileSync(path.join(__dirname,'../components/attachments/HarmonyAttachments.tsx'),'utf8')
const phl=fs.readFileSync(path.join(__dirname,'../app/api/phl/work-requests/route.ts'),'utf8')
assert.ok(api.indexOf('if (!(await canViewParent') >= 0)
assert.ok(api.indexOf('attachments: await secureReadableAttachments') > api.indexOf('if (!(await canViewParent'))
assert.match(api,/const verified=await verifiedEvidenceOwner\(admin,bucket,path,owner\)/)
assert.match(api,/const signed=verified\?await scannedSignedUrl\(admin,bucket,path\):null/)
assert.match(api,/file_url:signed \|\| ''/)
assert.match(phl,/await verifiedEvidenceOwner\(context.admin,bucket,path,owner.employee_id\)/)
assert.match(phl,/await readCheckedEvidenceBytes\(context.admin, bucket, path/)
assert.match(api,/legacyReferences\(parent\)\.some/)
assert.match(view,/loadedKey === viewKey \? attachments : \[\]/)
assert.doesNotMatch(view,/mergeLegacyLinks\(/)
assert.match(phl,/signed_url: null/)
assert.doesNotMatch(phl,/signedUrl = data\?\.signedUrl \|\| signedUrl/)
console.log('RC3N evidence reference PASS: 27 URL/path cases; 12 static route/view checks.')

// Exercise the actual metadata-only list against 124 requests and 154 attachments.
const listingStart = phl.indexOf('async function withAttachments(')
const listingEnd = phl.indexOf('export async function GET(', listingStart)
assert.ok(listingStart >= 0 && listingEnd > listingStart)
const listing = ts.transpileModule(phl.slice(listingStart, listingEnd), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const withAttachments = new Function(`${listing}\nreturn withAttachments`)()
const rows = Array.from({length:124},(_,i)=>({id:`request-${i}`,employee_id:'owner'}))
const attachments = Array.from({length:154},(_,i)=>({id:`attachment-${i}`,request_id:`request-${i%124}`,slot_no:i<124?1:2,file_name:'qa.pdf',mime_type:'application/pdf',file_size:12,storage_bucket:'leave-attachments',storage_path:'sensitive/path.pdf',legacy_file_url:'https://untrusted.invalid/file.pdf'}))
let metadataQueries=0
const mock = {
  from(table){assert.equal(table,'phl_work_request_attachments');metadataQueries++;let ids;return {select(columns){assert.doesNotMatch(columns,/storage_path|legacy_file_url|storage_bucket/);return this},in(column,values){assert.equal(column,'request_id');assert.ok(values.length<=100);ids=values;return this},async order(){return {data:attachments.filter(a=>ids.includes(a.request_id)),error:null}}}},
  rpc(){throw Error('No ownership lookup on metadata list')},
  get storage(){throw Error('No Storage reads on metadata list')}
}
;(async()=>{
 const result=await withAttachments(mock,rows)
 assert.equal(result.length,124); assert.equal(result.flatMap(r=>r.attachments).length,154);assert.equal(metadataQueries,2)
 for(const a of result.flatMap(r=>r.attachments)){assert.equal(a.signed_url,null);assert.equal(a.storage_path,undefined);assert.equal(a.legacy_file_url,undefined);assert.equal(a.storage_bucket,undefined)}
 assert.deepEqual(await withAttachments(mock,[]),[]);assert.equal(metadataQueries,2)
 const failed={from(){return {select(){return this},in(){return this},async order(){return {data:null,error:Error('metadata unavailable')}}}}};await assert.rejects(withAttachments(failed,rows),/metadata unavailable/)
 const read=phl.slice(phl.indexOf('if (evidenceId)'),phl.indexOf('const scope ='))
 assert.match(read,/isHR/);assert.match(read,/isOwner/);assert.match(read,/isSupervisor/)
 assert.ok(read.indexOf('if (!isHR && !isOwner && !isSupervisor)')<read.indexOf('await verifiedEvidenceOwner'))
 assert.ok(read.indexOf('await verifiedEvidenceOwner')<read.indexOf('await readCheckedEvidenceBytes'))
 assert.match(read,/legacy.bucket !== bucket \|\| legacy.path !== path/)
 assert.match(read,/checked.verdict === 'clean'/)
 console.log('PASS: 124 PHL requests / 154 attachment metadata in 2 queries, zero scans/signatures, scope and on-demand security guards.')
})().catch(error=>{console.error(error);process.exitCode=1})
