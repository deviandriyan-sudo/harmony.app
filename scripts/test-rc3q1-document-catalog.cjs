/* eslint-disable @typescript-eslint/no-require-imports -- Standalone regression harness. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const read = p => fs.readFileSync(p,'utf8')
function compile(path, loader) {
  const out = ts.transpileModule(read(path), { fileName:path,reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX} })
  assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[])
  const m={exports:{}}
  new Function('module','exports','require',out.outputText)(m,m.exports,loader)
  return m.exports
}
const lib=compile('lib/document-numbering.ts',require)
const requests=[]
let authorized=true, rpcError=null, payload={mode:'auto',total:32,rows:[],counts:{all:32,legacy:32,issued:0,pending:0,blocked:0,unavailable:0},statuses:['paid'],mode_history:[]}
const route=compile('app/api/hr/document-numbering/route.ts',id=>{
  if(id==='next/server')return {NextResponse:{json:(body,options)=>({body,...options})}}
  if(id==='@/lib/server/hr-api-auth')return {requireHRApi:async()=>{if(!authorized)throw Object.assign(Error('Forbidden'),{status:403});return {authUserId:'server-bound-hr',admin:{rpc:async(name,args)=>{requests.push({name,args});return rpcError?{error:rpcError}:{data:payload}}}}},apiError:(e,fallback)=>({status:e.status||500,message:e.status?e.message:fallback})}
  if(id==='@/lib/document-numbering')return lib
  throw Error('Unexpected dependency '+id)
})
async function run(){
  const get=q=>route.GET({nextUrl:new URL('https://example.test/api/hr/document-numbering?'+q)})
  const res=await get('module=remed&view=catalog&search=ABC%2F123&month=2026-11&state=legacy&status=paid&offset=50&actor=forged')
  assert.equal(res.status,200);assert.equal(res.headers['Cache-Control'],'private, no-store')
  assert.deepEqual(requests.at(-1),{name:'harmony_rc3q1_document_catalog_v1',args:{p_actor:'server-bound-hr',p_module:'remed',p_offset:50,p_search:'ABC/123',p_state:'legacy',p_month:'2026-11',p_status:'paid'}})
  for(const q of ['module=unknown&view=catalog','module=remed&view=unknown','module=remed&view=catalog&offset=1','module=remed&view=catalog&state=x','module=remed&view=catalog&month=2026-13','module=remed&view=catalog&status=bad%20status','module=remed&view=catalog&search='+('A'.repeat(121))]){const before=requests.length;assert.equal((await get(q)).status,400,q);assert.equal(requests.length,before)}
  authorized=false;assert.equal((await get('module=remed&view=catalog')).status,403);authorized=true
  rpcError={code:'42501',message:'private details'};assert.equal((await get('module=remed&view=catalog')).status,403);rpcError=null
  payload={...payload,total:-1};assert.equal((await get('module=remed&view=catalog')).status,503)
  payload={...payload,total:0,rows:Array(51).fill({})};assert.equal((await get('module=remed&view=catalog')).status,503)
  payload={mode:'auto',pending_count:0,pending:[]};assert.equal((await get('module=remed')).status,200);assert.equal(requests.at(-1).name,'harmony_rc3q_document_numbering_v1')
  const ui=read('components/settings/DocumentNumberingSettings.tsx');const syntax=ts.transpileModule(ui,{fileName:'DocumentNumberingSettings.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}})
  assert.deepEqual((syntax.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[])
  for(const required of ['Form Permohonan Pembayaran','Formulir Pengajuan Training','Register dokumen','mode_history','document_id: selected','expected_mode: data.mode','chosen.numbering_state !== \'pending\'','generation.current !== request','Referensi transaksi','Nomor resmi terkunci'])assert.ok(ui.includes(required),required)
  assert.doesNotMatch(read('app/api/hr/document-numbering/route.ts'),/\.update\(|\.delete\(|\.insert\(/)
  console.log('RC3Q.1 PASS: catalog handler, role binding, filters, invalid payload, legacy API, immutable issue guard, TSX syntax (mock/static; not browser E2E).')
}
run().catch(e=>{console.error(e);process.exitCode=1})
