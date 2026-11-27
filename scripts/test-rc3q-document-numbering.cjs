/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS regression harness. */
const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8');const m={exports:{}};new Function('module','exports',ts.transpileModule(read('lib/document-numbering.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports)
const {documentNumberLabel,isDocumentNumberPending,normalizeManualDocumentNumber,isNumberingModule,isDocumentNumberMode}=m.exports
assert.equal(documentNumberLabel({},'RM-202611-00023'),'RM-202611-00023')
assert.equal(documentNumberLabel({document_number_mode:null,document_number:null},'legacy-uuid'),'legacy-uuid')
assert.equal(isDocumentNumberPending({document_number_mode:'manual',document_number:null}),true)
assert.equal(isDocumentNumberPending({document_number_mode:'auto',document_number:null}),true)
assert.equal(documentNumberLabel({document_number_mode:'manual'},'internal-id'),'Belum diterbitkan')
assert.equal(documentNumberLabel({document_number_mode:'manual',document_number:'001/REM/2026'},'internal-id'),'001/REM/2026')
assert.equal(normalizeManualDocumentNumber(' 001/rem/2026 '),'001/REM/2026')
for(const invalid of ['',' ','=1','+123','-x','@x','<script>','A\nB','A B','A'.repeat(81),'é','ß',null,123])assert.equal(normalizeManualDocumentNumber(invalid),null)
assert.equal(isNumberingModule('remed'),true);assert.equal(isNumberingModule('scaleup'),true);assert.equal(isNumberingModule('other'),false);assert.equal(isDocumentNumberMode('manual'),true);assert.equal(isDocumentNumberMode('auto'),true);assert.equal(isDocumentNumberMode(''),false)
const api=read('app/api/hr/document-numbering/route.ts');assert.equal((api.match(/await requireHRApi\(request\)/g)||[]).length,2);assert.match(api,/p_actor: ctx.authUserId/);assert.match(api,/p_expected_mode: body.expected_mode/);assert.match(api,/p_document_id: body.document_id/);assert.match(api,/private, no-store/);assert.doesNotMatch(api,/\.update\(/)
const print=read('components/remed/PaymentRequestPrint.tsx');assert.match(print,/if \(isDocumentNumberPending\(claim\)\)/);assert.match(print,/documentNumberLabel\(claim, claim.claim_number\)/);assert.match(print,/Referensi klaim: \{claim.claim_number\}/)
const scale=read('components/scaleup/ScaleupWorkspace.tsx');assert.match(scale,/disabled=\{isDocumentNumberPending\(row\)\}/);assert.match(scale,/printRequest&&!isDocumentNumberPending\(printRequest\)/);assert.match(scale,/documentNumberLabel\(printRequest,printRequest.id\)/);assert.match(scale,/existing_id:existing,idempotency_key:crypto.randomUUID\(\)/)
assert.match(read('lib/server/scaleup.ts'),/id,document_number,document_number_mode,requester_employee_id/)
assert.match(read('app/hr/settings/page.tsx'),/<DocumentNumberingSettings \/>/)
assert.match(read('components/settings/DocumentNumberingSettings.tsx'),/expected_mode: data.mode/)
assert.match(read('components/settings/DocumentNumberingSettings.tsx'),/document_id: selected/)
console.log('RC3Q PASS: legacy references, automatic/manual display, invalid input, HR API binding, immutable issuance UI, print guards, request identity and route integration.')

async function routeTests() {
  const requests=[];let authorized=true;let dbError=null
  const ctx={authUserId:'server-verified-hr',admin:{rpc:async(name,args)=>{requests.push({name,args});return dbError?{error:dbError}:{data:args.p_action==='get'?{mode:'auto',pending_count:0,pending:[]}:args.p_action==='issue'?{document_number:args.p_number}:{mode:args.p_mode}}}}}
  const mockRequire=id=>{
    if(id==='next/server')return {NextResponse:{json:(body,options)=>({body,...options})}}
    if(id==='@/lib/server/hr-api-auth')return {requireHRApi:async()=>{if(!authorized)throw Object.assign(Error('Forbidden'),{status:403});return ctx},apiError:(e,fallback)=>({status:e.status||500,message:e.status?e.message:fallback})}
    if(id==='@/lib/document-numbering')return m.exports
    throw Error(`Unexpected dependency: ${id}`)
  }
  const route={exports:{}};new Function('module','exports','require',ts.transpileModule(read('app/api/hr/document-numbering/route.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(route,route.exports,mockRequire)
  const {GET,POST}=route.exports;const get=q=>GET({nextUrl:new URL(`https://example.test/api/hr/document-numbering?${q}`)})
  const post=body=>POST({json:async()=>body})
  let response=await get('module=scaleup&offset=50');assert.equal(response.status,200);assert.equal(response.headers['Cache-Control'],'private, no-store');assert.equal(requests[0].args.p_offset,50)
  assert.equal((await get('module=unknown')).status,400);assert.equal((await get('module=remed&offset=1')).status,400)
  authorized=false;assert.equal((await get('module=remed')).status,403);assert.equal((await post({})).status,403);authorized=true
  const doc='f4bc1589-c463-4cad-95d9-c88f6f68705b'
  assert.equal((await post({module:'remed',action:'issue',document_id:doc,number:'=1',reason:'QA test'})).status,400)
  response=await post({module:'remed',action:'issue',document_id:doc,number:' 001/rem/2026 ',reason:'QA test',p_actor:'forged'})
  assert.equal(response.status,200);assert.equal(requests.at(-1).args.p_actor,'server-verified-hr');assert.equal(requests.at(-1).args.p_number,'001/REM/2026');assert.equal(requests.at(-1).args.p_document_id,doc)
  assert.equal((await post({module:'scaleup',action:'set_mode',mode:'manual',expected_mode:'auto',reason:'QA test'})).status,200);assert.equal(requests.at(-1).args.p_expected_mode,'auto')
  dbError={code:'23505',message:'private table details'};response=await post({module:'remed',action:'issue',document_id:doc,number:'001/REM/2026',reason:'QA test'});assert.equal(response.status,409);assert.doesNotMatch(response.body.message,/private table/)
  dbError={code:'40001'};assert.equal((await post({module:'scaleup',action:'set_mode',mode:'manual',expected_mode:'auto',reason:'QA test'})).status,409)
  dbError={code:'42501'};assert.equal((await get('module=remed')).status,403)
  console.log('RC3Q API mock PASS: actual GET/POST handlers, forged actor rejected by server binding, input validation, duplicate/stale mode/role errors, no-store.')
}
routeTests().catch(error=>{console.error(error);process.exitCode=1})
