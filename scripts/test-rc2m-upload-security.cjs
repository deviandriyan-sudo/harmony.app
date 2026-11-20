/* eslint-disable @typescript-eslint/no-require-imports */
/* RC2M: executable tests of the actual server-side validator and error mapper.
 * No database writes, storage connection, or credentials required. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
function loadTs(file, snippetOnly) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  let content = source
  if (snippetOnly) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === snippetOnly)
    assert(node, `Missing ${snippetOnly}`)
    content = `export ${node.getText(ast)}`
  }
  const js = ts.transpileModule(content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const obj = new Module(path.join(root,file))
  obj.filename = path.join(root,file)
  obj.paths = Module._nodeModulePaths(path.dirname(obj.filename))
  obj._compile(js, obj.filename)
  return obj.exports
}
const {validUploadSignature, validUploadFileSignature, uploadExpectedMime} = loadTs('lib/server/upload-validation.ts')
const {remedApiError} = loadTs('lib/server/remed-api-auth.ts', 'remedApiError')
const {profileError} = loadTs('lib/server/employee-profile-auth.ts', 'profileError')
const blob = x => new Uint8Array(x)
const pd = blob([37,80,68,70,45,49,46,55,10])
const jp = blob([255,216,255,0xe0,0,0])
const pn = blob([137,80,78,71,13,10,26,10,0])
const wb = blob([82,73,70,70,0,0,0,0,87,69,66,80])
const ol = blob([208,207,17,224,161,177,26,225,0])
const zp = blob([80,75,3,4,20,0,0,0])
const cases = [
 ['pdf','evidence.PDF', pd,'application/pdf',true],
 ['jpeg','receipt.jpeg', jp,'image/jpeg',true],
 ['png','passport.png',pn,'image/png',true],
 ['webp','signature.webp',wb,'image/webp',true],
 ['legacy doc','letter.doc',ol,'application/msword',true],
 ['legacy xls','report.xls',ol,'application/vnd.ms-excel',true],
 ['docx','policy.docx',zp,'application/vnd.openxmlformats-officedocument.wordprocessingml.document',true],
 ['xlsx','attendance.xlsx',zp,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',true],
 ['no mime','old.doc',ol,'',true],
 ['octet fallback','old.xls',ol,'application/octet-stream',true],
 ['fake pdf','evidence.pdf',new TextEncoder().encode('<script>alert(1)</script>'),'application/pdf',false],
 ['fake image','signature.png',pd,'image/png',false],
 ['mismatch MIME','a.pdf',pd,'image/png',false],
 ['mismatch extension','a.exe',pd,'application/pdf',false],
 ['empty file','blank.pdf',blob([]),'application/pdf',false],
 ['truncated WEBP','bad.webp',wb.slice(0,8),'image/webp',false],
]
for (const [label,name,bytes,mime,expected] of cases) {
  assert.equal(validUploadSignature(name,bytes,mime),expected,label)
}
assert.equal(uploadExpectedMime('IMAGE.JPEG'),'image/jpeg')
assert.equal(uploadExpectedMime('hack.html'),null)
const FileImpl = global.File || require('node:buffer').File
;(async () => {
  for (const [label,name,bytes,mime,expected] of cases) {
    const file = new FileImpl([bytes],name,{type:mime})
    assert.equal(await validUploadFileSignature(file),expected,`File: ${label}`)
  }
  assert.deepEqual(remedApiError({status:401,message:'Session expired'}), {status:401,message:'Session expired'})
  assert.deepEqual(remedApiError({status:409,message:'Conflict'}), {status:409,message:'Conflict'})
  assert.deepEqual(remedApiError({status:503,message:'DB: select secret from users'}), {status:503,message:'Terjadi kesalahan pada Re-Med.'})
  assert.deepEqual(remedApiError(new Error('connection string')), {status:500,message:'Terjadi kesalahan pada Re-Med.'})
  assert.deepEqual(remedApiError({status:777,message:'leak'}), {status:500,message:'Terjadi kesalahan pada Re-Med.'})
  assert.equal(profileError({status:500,message:'private db'}).message,'Permintaan profil gagal diproses.')
  assert.equal(profileError({status:403,message:'Akses profil ditolak.'}).message,'Akses profil ditolak.')
  const guarded = [
    'app/api/attachments/route.ts',
    'app/api/hr/phl-adjustments/route.ts',
    'app/api/employee/profile/documents/route.ts',
    'app/api/scaleup/documents/route.ts',
    'app/api/remed/claims/route.ts',
    'app/api/remed/uploads/receipts/route.ts',
    'app/api/remed/signatures/route.ts',
  ]
  for (const route of guarded) {
    const source = fs.readFileSync(path.join(root,route),'utf8')
    assert(source.includes("@/lib/server/upload-validation"), `Missing shared validator in ${route}`)
  }
  const claim = fs.readFileSync(path.join(root,'app/api/remed/claims/route.ts'),'utf8')
  assert(claim.includes('.download(receipt.path)') && claim.includes('stored.size !== receipt.fileSize'), 'Signed receipt bytes must be checked before claim RPC')
  console.log(`RC2M PASS: ${cases.length * 2} executable signature cases, 7 protected routes, staged receipt verification, response sanitization`)
})().catch(e => {console.error(e);process.exitCode=1})
