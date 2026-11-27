/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS regression harness. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(path, dependencies = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  new Function('module','exports','require',code)(m,m.exports,name=>Object.hasOwn(dependencies,name)?dependencies[name]:require(name))
  return m.exports
}
async function main() {
  const {RequestCoordinator,canShareRead} = load('lib/request-coordinator.ts')
  const c=new RequestCoordinator(); c.observeToken('a'); let calls=0
  const get=()=>c.run('a','/api/scaleup',async()=>++calls)
  assert.deepEqual(await Promise.all([get(),get(),get()]),[1,1,1]); assert.equal(await get(),2)
  assert.equal(await c.run('a','/api/scaleup?filter=mine',async()=>++calls),3)
  let finish; const stale=c.run('a','slow',()=>new Promise(r=>finish=r)); await Promise.resolve(); c.observeToken('b'); finish(99); await assert.rejects(stale,/Sesi/)
  await assert.rejects(c.run('b','retry',async()=>{throw Error('failed')})); assert.equal(await c.run('b','retry',async()=>42),42)
  let end; const old=c.run('b','read',()=>new Promise(r=>end=r)); await Promise.resolve(); c.clearReads(); assert.equal(await c.run('b','read',async()=>8),8); end(7); assert.equal(await old,7)
  assert(canShareRead('/api/scaleup?scope=mine')); assert(!canShareRead('/api/attachments')); assert(!canShareRead('/api/scaleup',{method:'POST'})); assert(!canShareRead('/api/scaleup',{signal:new AbortController().signal})); assert(!canShareRead('/api/employee/leave/postpone'))
  const {readCompletePages,readIdBatches}=load('lib/server/read-complete-pages.ts')
  const rows=Array.from({length:1201},(_,i)=>({id:String(i)})); let pages=0
  assert.deepEqual(await readCompletePages(async(a,b)=>{pages++;return{data:rows.slice(a,b+1),count:rows.length,error:null}},'QA'),rows); assert.equal(pages,5)
  await assert.rejects(readCompletePages(async(a,b)=>({data:rows.slice(a,b+1),count:a?1200:1201,error:null}),'QA'),/berubah/)
  await assert.rejects(readCompletePages(async()=>({data:[{id:'1'},{id:'1'}],count:2,error:null}),'QA'),/konsisten/)
  await assert.rejects(readCompletePages(async()=>({data:[],count:5001,error:null}),'QA'),/batas/)
  await assert.rejects(readCompletePages(async()=>({data:[],count:10,error:null}),'QA'),/tidak lengkap/)
  assert.deepEqual(await readCompletePages(async()=>({data:[],count:0,error:null}),'QA'),[])
  // Exercise the rebased HR reporting contract, including the raised limit.
  const reportRows=Array.from({length:5201},(_,i)=>({id:`log-${i}`}))
  const {loadAttendanceReportingDataset}=load('lib/attendance-reporting-data.ts',{
    '@/lib/server/read-complete-pages':{readCompletePages},
    '@/lib/error-utils':{readErrorMessage:e=>e?.message},
    '@/lib/attendance-reporting':{getCutoffRange:()=>({start:'2026-11-11',end:'2026-12-10'})},
  })
  const reportClient=(failureTable=null)=>({from(table){
    const list=table==='attendance_logs'?reportRows:[]
    const result=(a=0,b=list.length-1)=>({data:list.slice(a,b+1),count:list.length,error:table===failureTable?{message:'QA incomplete source'}:null})
    const builder={range:(a,b)=>Promise.resolve(result(a,b)),then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)}
    for(const method of ['select','order','eq','is','gte','lte'])builder[method]=()=>builder
    return builder
  }})
  const report=await loadAttendanceReportingDataset(reportClient(),'2026-12')
  assert.equal(report.logs.length,5201);assert.equal(report.logs.at(-1).id,'log-5200')
  for(const table of ['attendance_logs','leave_requests','phl_records','attendance_period_confirmations','employees','holidays','harmony_request_types']){
    await assert.rejects(loadAttendanceReportingDataset(reportClient(table),'2026-12'),e=>e?.message==='QA incomplete source')
  }
  await assert.rejects(readCompletePages(async()=>({data:[],count:100001,error:null}),'Laporan absensi HR',100_000),/batas/)
  assert.deepEqual(await readIdBatches(['a','a','b','c'],async ids=>ids,2),['a','b','c'])
  const {getRemedDashboardTotals}=load('lib/server/remed-dashboard-totals.ts'); const valid={totalClaims:1005,pendingHR:2,paidCount:1000,paidTotal:'1500000',financeSummary:{review:1,waitingPayment:2,followup:0,periodPaidTotal:'250000'}}
  const result=await getRemedDashboardTotals({rpc:async name=>{assert.equal(name,'harmony_rc3p_remed_dashboard_totals_v1');return {data:valid,error:null}}}); assert.equal(result.paidTotal,1500000);assert.equal(result.financeSummary.periodPaidTotal,250000)
  await assert.rejects(getRemedDashboardTotals({rpc:async()=>({data:{...valid,paidTotal:null},error:null})}),/tidak lengkap/)
  await assert.rejects(getRemedDashboardTotals({rpc:async()=>({data:{...valid,totalClaims:1.5},error:null})}),/tidak valid/)
  const read=p=>fs.readFileSync(p,'utf8');assert(!read('app/remed/layout.tsx').includes("localStorage.setItem('remed_user'"));assert(read('components/layout/AppSidebar.tsx').includes('prewarmHarmonyUiAccess'));assert(read('components/scaleup/ScaleupWorkspace.tsx').includes('loadAuthorities'));assert(!read('components/remed/RemedAdminDashboard.tsx').includes('/api/remed/finance/summary'))
  // Rebase regression: keep the locally audited identity and reporting safeguards.
  let token='a',userId='user-a',epoch=1,responseUser='user-a',sessionCalls=0,finishSession
  const sessionMock={authReadEpoch:()=>epoch,getAuthorizedIdentity:async()=>({token,userId}),isCurrentRead:(t,e)=>t===token&&e===epoch,requestWithToken:async()=>{sessionCalls++;return {session:{authUserId:responseUser,isActive:true}}}}
  const session=load('lib/remed-session-client.ts',{'@/lib/harmony-client':sessionMock})
  await Promise.all([session.getRemedUiSession(),session.getRemedUiSession()]); assert.equal(sessionCalls,1)
  session.clearRemedUiSession();responseUser='wrong';await assert.rejects(session.getRemedUiSession(),/Identitas/)
  responseUser='user-a';sessionMock.requestWithToken=()=>new Promise(r=>finishSession=r)
  const obsolete=session.getRemedUiSession();await Promise.resolve();await Promise.resolve();session.clearRemedUiSession();finishSession({session:{authUserId:'user-a',isActive:true}});await assert.rejects(obsolete,/berubah/)
  sessionMock.requestWithToken=async()=>({session:{authUserId:userId,isActive:false}});token='b';userId='user-b';epoch++;await assert.rejects(session.getRemedUiSession(),/tidak aktif/)
  await assert.rejects(readCompletePages(async()=>({data:[{id:null}],count:1,error:null}),'QA'),/konsisten/)
  assert(read('lib/attendance-reporting-data.ts').includes("readCompletePages(query,'Laporan absensi HR',100_000)"))
  assert(read('components/attendance/useHRAttendanceReporting.ts').includes('snapshot?.period === periodMonth'))
  assert(read('app/hr/attendance/export/page.tsx').includes('if (loading || !dataset) return'))
  assert(read('app/remed/layout.tsx').includes('routeAllowed ? children : null'))
  assert(read('lib/server/user-api-auth.ts').includes('const boundAppUser=appUser'))
  assert(read('lib/server/remed-api-auth.ts').includes('const boundAccess=access'))
  console.log('RC3P PASS: session isolation, single-flight, no completed data cache, mutation refresh separation, complete pages 1201 rows, explicit partial/error states, RPC validation and navigation guards.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
