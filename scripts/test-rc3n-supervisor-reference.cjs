/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.join(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'lib/supervisor-reference-policy.ts'), 'utf8')
const mod = { exports: {} }
new Function('exports', 'module', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mod.exports, mod)
const { buildSupervisorReferenceIndex, uniquelyMatchesSupervisor } = mod.exports
const index = buildSupervisorReferenceIndex([
  { id: 'a', full_name: 'Same Name', employee_number: '001', machine_pin: '001', email: 'A@example.test', is_active: true },
  { id: 'b', full_name: 'Same Name', employee_number: '002', machine_pin: '001', is_active: true },
  { id: 'c', full_name: 'Inactive', employee_number: '003', is_active: false },
  { id: 'd', full_name: 'Legacy', email: 'D@example.test', is_active: null },
])
for (const [ref, actor, expected] of [['a','a',true],['A@example.test','a',true],['  a@EXAMPLE.test ','a',true],['Same Name','a',false],['Same Name','b',false],['001','a',false],['001','b',false],['002','b',true],['003','c',false],['Inactive','c',false],['legacy','d',true],['','a',false],[null,'a',false],['002','a',false],['a','',false]]) assert.equal(uniquelyMatchesSupervisor(index,ref,actor),expected,String(ref))
const sourceOf = p => fs.readFileSync(path.join(root,p),'utf8')
const phl = sourceOf('lib/server/phl-work.ts')
assert.match(phl,/employeesResult\.count !== employees\.length/)
assert.match(phl,/assignmentsResult\.count !== assignments\.length/)
assert.match(phl,/!activeIds\.has\(row\.employee_id\)/)
assert.match(phl,/assignmentIsEffective\(row, today\)/)
assert.match(sourceOf('app/api/attachments/route.ts'),/getPHLSubordinateIds\(admin, \{ id: identity\.employeeId \}\)/)
assert.match(sourceOf('app/api/attachments/route.ts'),/employee\.data\.is_active === false/)
assert.match(sourceOf('app/api/phl/work-requests/route.ts'),/!validEvidenceObjectPath\(path\) \|\| \(evidence\.legacy_file_url/)
console.log('RC3N supervisor reference PASS: 15 cases, 7 static guards (not a live HTTP test).')
