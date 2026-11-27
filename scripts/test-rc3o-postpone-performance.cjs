/* eslint-disable @typescript-eslint/no-require-imports */
const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');const load=p=>{const m={exports:{}};new Function('module','exports',ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports};
const {verifiedPostponeDays,hasActivePostponeRequest}=load('lib/postpone-eligibility.ts');
assert.equal(verifiedPostponeDays({remaining_days:12,postpone_eligible_days:4}),4);
for(const v of [null,undefined,{}, {postpone_eligible_days:null},{postpone_eligible_days:'invalid'},{postpone_eligible_days:-3},{remaining_days:12}])assert.equal(verifiedPostponeDays(v),0);
assert.equal(verifiedPostponeDays({postpone_eligible_days:2.5}),2.5);
assert.equal(hasActivePostponeRequest([{source_cycle_id:'a',approval_status:'pending_hr'}],'a'),true);
for(const row of [{source_cycle_id:'b',approval_status:'approved'},{source_cycle_id:'a',approval_status:'rejected'},{source_cycle_id:'a',approval_status:'cancelled'},{source_cycle_id:'a',approval_status:'approved',is_active:false}])assert.equal(hasActivePostponeRequest([row],'a'),false);
const employee=read('app/employee/leave/postpone/page.tsx'),hr=read('app/hr/leave/administration/page.tsx');
assert.match(employee,/const availableDays = verifiedPostponeDays\(selectedCycle\)/);assert.match(employee,/max=\{availableDays\}/);assert.match(employee,/requestedDays > availableDays/);assert.match(employee,/!alreadyRequested/);assert.match(employee,/hasActivePostponeRequest\(requests, selectedCycle.id\)/);assert.doesNotMatch(employee,/max=\{Number\(selectedCycle\?\.remaining_days/);
assert.match(hr,/const availableToAdd = verifiedPostponeDays\(selectedCycle\)/);assert.match(hr,/postponeDays > computedCycleInfo.availableToAdd/);
for(const p of ['app/hr/phl/page.tsx','app/employee/phl/page.tsx','app/employee/approvals/phl/page.tsx','app/employee/approvals/[employeeId]/[period]/page.tsx'])assert.match(read(p),/openPHLWorkEvidence\(/);
const client=read('lib/phl-work.ts');assert.match(client,/x-harmony-malware-status.*=== 'clean'/);assert.match(client,/link.download = disposition.match/);
const management=read('lib/server/remed-signatures.ts').split('export async function getRemedSignatureManagement')[1];assert.doesNotMatch(management,/await createSignatureUrl|scannedSignedUrl\(/);assert.match(management,/has_signature: Boolean/);
const route=read('app/api/remed/signatures/route.ts');const preview=route.split("if (scope === 'management-preview')")[1].split('if (!ctx.access.employee_id)')[0];assert.match(preview,/ctx.access.role !== 'hr'/);assert.match(preview,/getRemedSignatureDisplay/);assert.match(read('app/remed/hr/signatures/page.tsx'),/scope=management-preview/);
const phl=read('app/hr/phl/page.tsx');assert.match(phl,/hasLoaded \? counts.total : '—'/);assert.match(phl,/Data belum berhasil dimuat/);
console.log('PASS: effective cap 12→4, missing data fail-closed, duplicate guards, all four evidence entry points, deferred download, Re-Med lazy preview, honest loading state.');
