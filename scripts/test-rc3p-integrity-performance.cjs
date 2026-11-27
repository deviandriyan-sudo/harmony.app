/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS regression harness. */
const fs=require('node:fs');const assert=require('node:assert/strict');const ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
const load=(path,requireMock=require)=>{const m={exports:{}};new Function('module','exports','require',ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,requireMock);return m.exports}
async function main(){
  const {readCompletePages,COMPLETE_PAGE_SIZE}=load('lib/server/read-complete-pages.ts')
  const fixture=Array.from({length:1136},(_,i)=>({id:`r${i}`,value:i}));let calls=0
  const page=(from,to)=>({data:fixture.slice(from,to+1),count:fixture.length,error:null})
  assert.deepEqual(await readCompletePages(async(from,to)=>{calls++;return page(from,to)},'QA'),fixture);assert.equal(calls,Math.ceil(fixture.length/COMPLETE_PAGE_SIZE))
  let offset=0
  assert.deepEqual(await readCompletePages(async(from,to)=>{assert.equal(from,offset);const data=fixture.slice(from,Math.min(to+1,from+150));offset+=data.length;return {data,count:fixture.length,error:null}},'QA'),fixture)
  assert.deepEqual(await readCompletePages(async()=>({data:[],count:0,error:null}),'QA'),[])
  await assert.rejects(readCompletePages(async()=>({data:[],count:5,error:null}),'QA'),/tidak lengkap/)
  await assert.rejects(readCompletePages(async()=>({data:[],count:null,error:null}),'QA'),/tidak dapat diverifikasi/)
  await assert.rejects(readCompletePages(async()=>({data:[{id:'a'},{id:'a'}],count:2,error:null}),'QA'),/konsisten/)
  await assert.rejects(readCompletePages(async(from,to)=>({...page(from,to),count:from?1135:1136}),'QA'),/berubah/)
  await assert.rejects(readCompletePages(async()=>({data:null,count:1,error:new Error('denied')}),'QA'),/denied/)
  await assert.rejects(readCompletePages(async()=>({data:[],count:10001,error:null}),'QA'),/batas/)
  await assert.rejects(readCompletePages(async()=>({data:[{id:'a'}],count:0,error:null}),'QA'),/tidak lengkap/)
  const report=read('lib/attendance-reporting-data.ts');assert.match(report,/readCompletePages\(query,\s*['\x22]Laporan absensi HR['\x22],\s*100_000\)/);assert.match(report,/Promise\.all\(\[/);assert.match(report,/if \(leaveResult.error\) throw leaveResult.error/);assert.match(report,/if \(phlResult.error\) throw phlResult.error/)
  const scale=read('components/scaleup/ScaleupWorkspace.tsx');assert.doesNotMatch(scale,/if\s*\(\s*loading\s*\)\s*return/);assert.match(scale,/mainState==='ready'\?/);assert.match(scale,/recordState==='ready'\?/);assert.match(scale,/mainState==='error'/);assert.match(scale,/recordState==='error'/);assert.match(scale,/mainState==='pending'/);assert.match(scale,/recordState!=='ready'/);assert.match(scale,/if\(!hr\|\|tab!=='configuration'\)return/);assert.match(scale,/if\(workspaceGeneration.current!==generation\)return/);assert.match(scale,/workspaceGeneration.current===generation/);assert.match(scale,/authorityGeneration.current===generation/);assert.match(scale,/Promise\.allSettled\(\[main,records\]\)/);assert.match(scale,/tab==='new'&&mainState==='ready'&&<form/)
  const server=read('lib/server/scaleup.ts');assert.match(server,/if \(owner\) query=query.eq\('requester_employee_id',owner\)/);assert.match(server,/readRequests\(employeeId\)/);assert.match(server,/eq\('approver_employee_id',employeeId\)/);assert.match(server,/readIdBatches\(assigned.map/);assert.doesNotMatch(server,/\.limit\(150\)/)
  const records=read('app/api/scaleup/records/route.ts');assert.match(records,/const employeeId=ctx.isHR\?null:requireScaleupEmployee\(ctx\)/);assert.equal((records.match(/if\(employeeId\)query=query.eq\('employee_id',employeeId\)/g)||[]).length,2);assert.match(records,/readIdBatches\(data.map\(row=>row.id\),ids=>readCompletePages/);assert.match(records,/in\('record_id',ids\)/);assert.match(records,/const \[employees,docs\]=await Promise\.all\(\[/);assert.match(records,/requireScaleupHR\(ctx\)/)
  const remed=read('app/remed/layout.tsx');assert.doesNotMatch(remed,/return <AccessLoading/);assert.match(remed,/routeAllowed \? children : null/);assert.match(remed,/getRemedUiSession\(\)/);assert.doesNotMatch(remed,/localStorage.setItem\('remed_user'/)
  const sidebar=read('components/layout/AppSidebar.tsx');assert.match(sidebar,/onPointerEnter=\{\(\) => warmModule\(item.href\)\}/);assert.match(sidebar,/if \(targetIsRemed\) void getRemedUiSession\(\)/);assert.match(sidebar,/else void prewarmHarmonyUiAccess\(\)/)
  const employee=read('app/remed/employee/dashboard/page.tsx');assert.match(employee,/data && !ent && !error/);assert.match(employee,/const generation = \+\+loadGeneration.current/);assert.match(employee,/if \(loadGeneration.current === generation\) setData\(result\)/);assert.match(employee,/if \(loadGeneration.current !== generation\) return/)
  const admin=read('components/remed/RemedAdminDashboard.tsx');assert.match(admin,/remedFetch<DashboardPayload>\('\/api\/remed\/dashboard'\)/);assert.doesNotMatch(admin,/\/api\/remed\/finance\/summary/);assert.match(admin,/data\?\.financeSummary/)
  const dashboard=read('app/api/remed/dashboard/route.ts');assert.match(dashboard,/await requireRemedApi\(request\)/);assert.match(dashboard,/const \[totals, recent\] = await Promise\.all\(\[/);assert.match(dashboard,/getRemedDashboardTotals\(ctx.admin\)/);assert.match(dashboard,/ctx.access.role === 'finance' \? \{ financeSummary: totals.financeSummary \}/)
  // Exercise real current client + coordinator + session adapter with controlled HTTP/token changes.
  let token='token-a',user='user-a',httpCalls=0
  const pending=[]
  const mockSupabase={auth:{getSession:async()=>({data:{session:token?{access_token:token,user:{id:user}}:null},error:null})}}
  const originalFetch=global.fetch
  global.fetch=async(url,init)=>{httpCalls++;assert.equal(url,'/api/remed/session');assert.equal(init.cache,'no-store');assert.equal(init.headers.get('Authorization'),`Bearer ${token}`);const currentUser=user;return new Promise(resolve=>pending.push((identity=currentUser,isActive=true)=>resolve({ok:true,json:async()=>({session:{authUserId:identity,role:'employee',isActive}})})))}
  const tick=()=>new Promise(resolve=>setImmediate(resolve))
  try{
    const coordinator=load('lib/request-coordinator.ts')
    const client=load('lib/harmony-client.ts',id=>{if(id==='@/lib/supabase')return {supabase:mockSupabase};assert.equal(id,'@/lib/request-coordinator');return coordinator})
    const cache=load('lib/remed-session-client.ts',id=>{assert.equal(id,'@/lib/harmony-client');return client})
    const a=cache.getRemedUiSession(),b=cache.getRemedUiSession();await tick();assert.equal(httpCalls,1);pending.shift()();assert.deepEqual(await a,await b);await cache.getRemedUiSession();assert.equal(httpCalls,1)
    cache.clearRemedUiSession();const old=cache.getRemedUiSession();const oldRejected=assert.rejects(old,/berubah/);await tick();const resolveOld=pending.shift();token='token-b';user='user-b';const next=cache.getRemedUiSession();await tick();resolveOld();await oldRejected;pending.shift()();assert.equal((await next).session.authUserId,'user-b');assert.equal(httpCalls,3)
    cache.clearRemedUiSession();const mismatch=cache.getRemedUiSession();const mismatchRejected=assert.rejects(mismatch,/Identitas/);await tick();pending.shift()('wrong-user');await mismatchRejected
    const inactive=cache.getRemedUiSession();const inactiveRejected=assert.rejects(inactive,/tidak aktif/);await tick();pending.shift()(user,false);await inactiveRejected
    token='';await assert.rejects(cache.getRemedUiSession(),/Session HARMONY/)
  }finally{global.fetch=originalFetch}
  console.log('RC3P integrity PASS: active reader 1136 rows, reduced cap, count/duplicate/error guards, scoped Scaleup, progressive sections, aggregate Re-Med and actual token-bound session client.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
