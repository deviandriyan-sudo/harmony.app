/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const page = fs.readFileSync('app/employee/attendance/page.tsx', 'utf8');
const source = ts.createSourceFile('attendance.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const payloads=[];
function visit(node){
 if(ts.isVariableDeclaration(node) && node.name.getText(source)==='payload' && node.initializer && ts.isObjectLiteralExpression(node.initializer) && node.initializer.getText(source).includes('getSubmittedStatus(row, draft)'))payloads.push(node.initializer);
 ts.forEachChild(node,visit);
}
visit(source);
assert.equal(payloads.length,1);
const keys=payloads[0].properties.filter(p=>p.name).map(p=>p.name.getText(source));
for(const name of ['employee_id','employee_number','machine_pin','full_name','department','position','attendance_date','check_in','check_out','total_punches','work_duration_minutes','source','notes'])assert.ok(!keys.includes(name),`Existing update includes protected ${name}`);
assert.match(page,/\.update\(payload\)\s*\.eq\("id", row\.log!\.id\)\s*\.eq\("employee_id", employee\.id\)\s*\.is\("deleted_at", null\)/);
assert.match(page,/\.insert\(\{\s*employee_id: employee\.id,[\s\S]*?attendance_date: row\.date,\s*check_in: null,\s*check_out: null,\s*total_punches: 0,\s*work_duration_minutes: null,\s*source: "employee_manual_confirmation",\s*notes: null,\s*\.\.\.payload,/);
assert.match(page,/\.eq\('id',row\.log\.id\)\.eq\('employee_id',employee\.id\)\.is\('deleted_at',null\)/);
const sql=fs.readFileSync('security/migrations/ATTENDANCE_READ_ISOLATION_NOT_APPLIED.sql','utf8');
assert.match(sql,/current_setting\('harmony\.rc3n_cutover_approved',true\)/);
assert.match(sql,/rc3n_attendance_identity_guard/);
assert.match(sql,/FOR UPDATE TO authenticated USING .* WITH CHECK/);
assert.match(sql,/FOR DELETE TO authenticated USING \(\(select harmony_internal\.rc3n_b2_is_hr\(\)\)\)/);
console.log('PASS: confirmation preserves fingerprint/identity fields, scoped update filters, gated attendance RLS source. DB state transitions require separate role E2E.');
