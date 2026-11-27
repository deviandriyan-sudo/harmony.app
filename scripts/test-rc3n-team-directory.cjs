/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript')
const load=file=>{const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports}
const x=load('lib/team-availability-contract.ts')
async function main(){
 assert.deepEqual(x.teamMonthRange('2024-02'),{start:'2024-02-01',end:'2024-02-29'})
 assert.deepEqual(x.teamMonthRange('2026-11'),{start:'2026-11-01',end:'2026-11-30'})
 for(const bad of ['2026-00','2026-13','2026-1','2026-11,or()', '1999-01','2101-01',''])assert.equal(x.teamMonthRange(bad),null)
 for(const name of ['TEAM_LEAVE_COLUMNS','TEAM_PHL_COLUMNS','TEAM_ATTENDANCE_COLUMNS','TEAM_DIRECTORY_COLUMNS']){const columns=x[name].split(',');assert.equal(new Set(columns).size,columns.length);for(const forbidden of ['*','reason','raw_data','notes','proof_file_url','correction_proof_url','annual_leave_balance','phl_balance','address','sinarmas_account_number','emergency_contact_phone','personal_phone'])assert.ok(!columns.includes(forbidden),`${name}: ${forbidden}`)}
 const rows=Array.from({length:1251},(_,i)=>({id:i}));assert.deepEqual(await x.collectTeamPages(async(from,to)=>({data:rows.slice(from,to+1),count:rows.length,error:null})),rows)
 assert.deepEqual(await x.collectTeamPages(async()=>({data:[],count:0,error:null})),[])
 await assert.rejects(x.collectTeamPages(async()=>({data:[],count:1,error:null})))
 await assert.rejects(x.collectTeamPages(async()=>({data:[],count:10001,error:null})))
 await assert.rejects(x.collectTeamPages(async(from)=>({data:rows.slice(from,from+500),count:from?1250:1251,error:null})))
 await assert.rejects(x.collectTeamPages(async()=>({data:null,count:null,error:{message:'denied'}})))
 const route=fs.readFileSync('app/api/employee/team-availability/route.ts','utf8');assert.match(route,/requireHarmonyApi\(request\)/);assert.match(route,/ctx\.employee\.id!==ctx\.appUser\.employee_id/);assert.doesNotMatch(route,/\.select\(['"]\*['"]\)|\.insert\(|\.update\(|\.delete\(|\.upsert\(/);assert.match(route,/private, no-store/)
 const component=fs.readFileSync('components/employee/TodayTeamAvailability.tsx','utf8');assert.doesNotMatch(component,/\.from\(/);assert.match(component,/if \(aId && bId\) return aId === bId/)
 const sql=fs.readFileSync('security/migrations/CORE_READ_ISOLATION_NOT_APPLIED.sql','utf8');assert.match(sql,/current_setting\('harmony\.rc3n_cutover_approved',true\)/);assert.match(sql,/rc3n_actor_row_scope/)
 console.log('PASS: team month validation, safe column projection, pagination, no broad browser team reads, strict API binding and staged migration gate.')
}
main().catch(e=>{console.error(e);process.exitCode=1})
