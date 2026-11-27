'use strict'
;(async()=>{
  const assert = (await import('node:assert/strict')).default
  const fs = (await import('node:fs')).default
  const path = (await import('node:path')).default
  const vm = (await import('node:vm')).default
  const ts = (await import('typescript')).default
  const root = path.resolve(__dirname, '..')
  const src = fs.readFileSync(path.join(root, 'lib/employee-phl-snapshot.ts'), 'utf8')
  const compiled = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true })
  assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
  let payload, rpcError = null, current = true, rpcCalls = 0
  const loaded = {exports: {}}
  const mocks = {
    '@/lib/supabase': {supabase: {rpc(name) { assert.equal(name, 'harmony_get_my_phl_snapshot_v1'); rpcCalls += 1; return {abortSignal(signal) { assert(signal instanceof AbortSignal); return Promise.resolve({data:payload,error:rpcError}) }} }}},
    '@/lib/harmony-client': {getAuthorizedIdentity:async()=>({token:'test-token',userId:'test-user'}),authReadEpoch:()=>1,isCurrentRead:(token,epoch)=>current && token==='test-token' && epoch===1}
  }
  vm.runInNewContext(compiled.outputText,{exports:loaded.exports,module:loaded,require:name=>{assert(Object.hasOwn(mocks,name));return mocks[name]},AbortController,setTimeout,clearTimeout},{filename:'employee-phl-snapshot.js'})
  const {validatePHLSnapshot:validate,fetchMyPHLSnapshot:fetchSnapshot}=loaded.exports
  const row = (overrides={})=>({id:'a',employee_id:'employee-1',phl_date:'2026-08-29',valid_from:'2026-08-29',expired_at:'2026-11-27',status:'approved',balance_days:1,used_days:0,remaining_days:1,reason:null,source:'attendance_phl_approved',display_state:'active',available_days:1,...overrides})
  const snapshot = (overrides={})=>({success:true,employee_id:'employee-1',as_of:'2026-11-27',total_available_days:1,active_ledger_balance:0,legacy_balance:1,expired_days:0,used_days:0,expiring_30_days:0,next_expiry:null,expiry_rule_days:90,record_count:0,records:[],...overrides})
  assert.equal(validate(snapshot(),'employee-1').total_available_days,1,'Legacy-only credit is visible with no ledger rows')
  assert.equal(validate(snapshot({total_available_days:0,legacy_balance:0})).total_available_days,0,'Real zero is accepted')
  const mixed = snapshot({total_available_days:2,active_ledger_balance:1,expired_days:1,used_days:1.5,expiring_30_days:1,next_expiry:'2026-11-27',record_count:4,records:[row({balance_days:1.5,used_days:0.5}),row({id:'b',expired_at:'2026-11-26',display_state:'expired',available_days:0}),row({id:'c',used_days:1,remaining_days:0,display_state:'used',available_days:0}),row({id:'d',balance_days:0,used_days:0,remaining_days:0,expired_at:null,display_state:'used',available_days:0})]})
  assert.equal(validate(mixed).active_ledger_balance,1,'Expiry date itself is still active')
  assert.equal(validate(mixed).expired_days,1)
  assert.equal(validate(mixed).used_days,1.5)
  const undated = snapshot({total_available_days:2,active_ledger_balance:1,record_count:1,records:[row({expired_at:null})]})
  assert.equal(validate(undated).records[0].expired_at,null,'Unknown source date is not invented')
  assert.throws(()=>validate(snapshot({total_available_days:2})),/detail ledger/)
  assert.throws(()=>validate(snapshot({total_available_days:null})),/tidak valid/)
  assert.throws(()=>validate(snapshot({record_count:1})),/tidak lengkap/)
  assert.throws(()=>validate(snapshot(),'employee-2'),/identitas/)
  assert.throws(()=>validate({...mixed,records:[row({employee_id:'employee-2'}),...mixed.records.slice(1)]}),/ledger PHL/)
  assert.throws(()=>validate({...mixed,records:[row({id:'b'}),...mixed.records.slice(1)]}),/ledger PHL/)
  assert.throws(()=>validate({...mixed,records:[row({source:'employee_phl_claim'}),...mixed.records.slice(1)]}),/ledger PHL/)
  assert.throws(()=>validate({...mixed,records:[row({expired_at:'2026-11-26'}),...mixed.records.slice(1)]}),/kedaluwarsa/)
  assert.throws(()=>validate({...mixed,records:[row({available_days:2}),...mixed.records.slice(1)]}),/kedaluwarsa/)
  payload=snapshot();assert.equal((await fetchSnapshot('employee-1')).legacy_balance,1)
  current=false;await assert.rejects(()=>fetchSnapshot(),/Sesi berubah/)
  current=true;rpcError={message:'denied'};await assert.rejects(()=>fetchSnapshot(),/gagal dimuat/)
  assert.equal(rpcCalls,3)
  console.log('RC3R PHL snapshot PASS: legacy-only, true zero, WITA boundary, expired/used, parity, ownership, incomplete data, stale token, RPC error (mock).')
  if(process.argv.includes('--helper-only')) {console.log('SOURCE INTEGRATION NOT RUN (--helper-only).');return}
  const read=p=>fs.readFileSync(path.join(root,p),'utf8')
  const leave=read('app/employee/leave/page.tsx'),dashboard=read('app/employee/dashboard/page.tsx'),phl=read('app/employee/phl/page.tsx')
  for(const source of [leave,dashboard,phl]) {
    assert.match(source,/fetchMyPHLSnapshot\(/)
    assert.doesNotMatch(source,/rpc\('get_my_phl_balance_summary'\)/)
  }
  for(const label of ['Saldo tersedia','PHL aktif','PHL expired','PHL terpakai','Saldo historis HR'])assert(leave.includes(label))
  assert.match(leave,/phlSummary === null/)
  assert.match(leave,/phlBalanceAvailable: boolean/)
  assert.match(leave,/phlSummary\.total_available_days/)
  assert.doesNotMatch(leave,/phlRemainingFromRecords/)
  assert.doesNotMatch(dashboard,/balance\?\.phl_total_available_days \?\? employee\?\.phl_balance/)
  assert.match(dashboard,/phlBalance===null\?'—'/)
  assert.match(phl,/fetchPHLWorkRequests\('mine'\)/)
  assert.match(phl,/submitPHLWorkRequest\(/)
  console.log('RC3R source integration guards PASS (not browser E2E).')
})().catch(e=>{console.error(e);process.exitCode=1})
