/* HARMONY PTKP compliance examples. Run locally with npm run test:ptkp. */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const source=fs.readFileSync(path.join(__dirname,'../lib/ptkp.ts'),'utf8')
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const m={exports:{}};vm.runInNewContext(js,{exports:m.exports,require,Date,JSON,Math,String,Number,Object,Array})
const calculate=m.exports.calculatePtkp
const child=(name,birth,fully_dependent='yes',has_income='no',married='no')=>({name,birth,fully_dependent,has_income,married})
const profile=(gender,marital_status,children=[],rest={})=>({identity:{gender},family:{marital_status,married_since:'2018-01-01',children_json:JSON.stringify(children),...rest}})
const examples=[
 [profile('Laki-laki','married',[child('A','2010-04-01'),child('B','2025-04-01')]),'K/2',67500000],
 [profile('Perempuan','married',[child('A','2010-04-01')]),'TK/0',54000000],
 [profile('Perempuan','married',[child('A','2010-04-01')],{husband_no_income_proof:'yes'}),'K/1',63000000],
 [profile('Laki-laki','married',[child('A','1999-04-01')]),'K/1',63000000],
 [profile('Laki-laki','married',[child('A','2026-01-02')]),'K/0',58500000],
 [profile('Laki-laki','married',Array.from({length:4},(_,i)=>child(String(i),'2020-04-01'))),'K/3',72000000],
 [profile('Laki-laki','unmarried',[]),'TK/0',54000000],
]
for(const [x,expected,amount] of examples){const r=calculate(x,2026);assert.equal(r.code,expected);assert.equal(r.annualAmount,amount)}
assert.equal(calculate({},2026).code,null)
assert.equal(calculate(profile('Laki-laki','married',[child('No Birth','')]),2026).unresolvedCount,1)
console.log(`PTKP checks PASS: ${examples.length+2} cases`)
