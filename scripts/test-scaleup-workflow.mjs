import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync('lib/scaleup/workflow.ts','utf8')
const compiled = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 }}).outputText
const workflowModule = { exports:{} }
// CommonJS module generated from the project's own TypeScript (no dynamic user input).
new Function('module','exports',compiled)(workflowModule,workflowModule.exports)
const {planScaleupApproval,DEFAULT_SCALEUP_POLICY} = workflowModule.exports
const normal={supervisor_1:'100', supervisor_2:'200',wadirsdk:'300',finance:'400',director:''}
const stages = planScaleupApproval(normal)
assert.deepEqual(stages.map(s=>s.obligations.join('+')),['supervisor_1','supervisor_2','wadirsdk','finance'])
for(const [name,nominees,expected] of [
 ['supervisor sdk',{...normal,supervisor_1:'300',supervisor_2:''},['supervisor_1+wadirsdk','finance']],
 ['supervisor finance',{...normal,supervisor_1:'400',supervisor_2:''},['wadirsdk','supervisor_1+finance']],
 ['supervisor director',{...normal,supervisor_1:'500',supervisor_2:'',director:'500'},['wadirsdk','finance','supervisor_1+director']],
 ['second supervisor executive',{...normal,supervisor_2:'300'},['supervisor_1','supervisor_2+wadirsdk','finance']],
 ['dual wadir same person',{...normal,supervisor_2:'',wadirsdk:'400'},['supervisor_1','wadirsdk','finance']],
 ['other wadir supervisor',{...normal,supervisor_1:'600',supervisor_2:''},['supervisor_1','wadirsdk','finance']],
]) {
 assert.deepEqual(planScaleupApproval(nominees).map(s=>s.obligations.join('+')),expected,name)
}
assert.throws(()=>planScaleupApproval({...normal,supervisor_2:'100'}),/berbeda/)
assert.throws(()=>planScaleupApproval({...normal,finance:''}),/wajib/)
assert.deepEqual(planScaleupApproval(normal,{...DEFAULT_SCALEUP_POLICY,merge_supervisor_executive:false}).length,4)
console.log('SCALE UP 9 workflow scenarios PASS (unit-level; Supabase integration not tested)')
