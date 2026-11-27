/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../lib/server/upload-validation.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }
new Function('exports', 'module', js)(mod.exports, mod)
const { validUploadContent, validUploadFileContent, validAttendanceImportContent } = mod.exports
// Inert ZIP structure fixtures only. No real malware, macros or user data.
function zip(entries) {
  const local = [], central = []; let offset = 0
  for (const item of entries) {
    const name = Buffer.from(item.name), data = Buffer.from(item.data || '<root/>')
    const h = Buffer.alloc(30), c = Buffer.alloc(46)
    h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(item.flags || 0, 6); h.writeUInt16LE(item.method || 0, 8); h.writeUInt32LE(data.length,18); h.writeUInt32LE(item.expanded || data.length,22); h.writeUInt16LE(name.length,26)
    c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(item.flags || 0,8); c.writeUInt16LE(item.method || 0,10); c.writeUInt32LE(data.length,20); c.writeUInt32LE(item.expanded || data.length,24); c.writeUInt16LE(name.length,28); c.writeUInt32LE(offset,42)
    local.push(h,name,data);central.push(c,name);offset+=h.length+name.length+data.length
  }
  const directory=Buffer.concat(central), end=Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16)
  return Buffer.concat([...local,directory,end])
}
const common=[{name:'[Content_Types].xml'},{name:'_rels/.rels'}]
const doc=[...common,{name:'word/document.xml'}], xls=[...common,{name:'xl/workbook.xml'}]
const pdf=Buffer.from('%PDF-1.7\n%%EOF\n')
const tests=[
 ['normal DOCX','a.docx',zip(doc),true], ['normal XLSX','a.xlsx',zip(xls),true],
 ['ZIP renamed PDF','a.pdf',zip(doc),false],['DOCX as XLSX','a.xlsx',zip(doc),false],['truncated ZIP','a.xlsx',zip(xls).subarray(0,60),false],
 ['macro part','a.docx',zip([...doc,{name:'word/vbaProject.bin',data:'inert'}]),false],['embedded object','a.docx',zip([...doc,{name:'word/embeddings/inert.bin'}]),false],
 ['path traversal','a.xlsx',zip([...xls,{name:'../inert.xml'}]),false],['encrypted flag','a.docx',zip([...doc,{name:'word/extra.xml',flags:1}]),false],
 ['duplicate entry','a.xlsx',zip([...xls,{name:'XL/WORKBOOK.XML'}]),false], ['oversized declared expansion','a.xlsx',zip([...xls,{name:'xl/extra.xml',method:8,expanded:60*1024*1024}]),false],
 ['disallowed extension','a.exe',pdf,false],['path filename','../a.pdf',pdf,false],['control filename','a\u0000.pdf',pdf,false],['oversize','a.pdf',Buffer.alloc(10*1024*1024+1),false],['PDF header','a.pdf',pdf,true]
]
;(async()=>{
 for(const [label,name,bytes,expected] of tests){assert.equal(validUploadContent(name,bytes),expected,label);assert.equal(await validUploadFileContent(new File([bytes],name)),expected,`${label}: File`)}
 assert.equal(validAttendanceImportContent('fingerprint.csv',Buffer.from('NIP,Date\n123,2026-11-26'),'text/csv'),true)
 assert.equal(validAttendanceImportContent('fingerprint.csv',Buffer.from('<html>bad</html>'),'text/csv'),false)
 assert.equal(validAttendanceImportContent('fingerprint.csv',Buffer.from([0x4d,0x5a,0,0]),'text/csv'),false)
 assert.equal(validAttendanceImportContent('fingerprint.xlsx',zip(xls)),true)
 assert.equal(validAttendanceImportContent('fingerprint.xlsx',zip(doc)),false)
 for(const route of ['app/api/phl/work-requests/route.ts','app/api/remed/finance/claims/[id]/payment/route.ts','app/api/attachments/route.ts','app/api/hr/phl-adjustments/route.ts','app/api/employee/profile/documents/route.ts','app/api/scaleup/documents/route.ts','app/api/remed/claims/route.ts','app/api/remed/signatures/route.ts']) assert.match(fs.readFileSync(path.join(__dirname,'..',route),'utf8'),/validUpload(?:File)?Content\(/,route)
 console.log('RC3N upload hardening PASS: 32 format cases, 5 attendance cases, 8 route guards (not antivirus).')
})().catch(e=>{console.error(e);process.exitCode=1})
