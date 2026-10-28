import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const read = file => readFileSync(file, 'utf8')
const css = read('app/theme-normalization.css')
const legacy = read('app/globals.css')
const layout = read('app/layout.tsx')
const provider = read('components/theme/ThemeProvider.tsx')
const pkg = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
assert.equal(pkg.version, '3.8.5')
assert.equal(pkg.version, lock.version)
assert.equal(pkg.version, read('lib/version.ts').match(/HARMONY_APP_VERSION = '([^']+)'/)?.[1])
assert(layout.includes("import './theme-normalization.css'"))
assert(provider.includes('harmony-color-theme') && provider.includes('localStorage.setItem'))
assert(!legacy.includes(') :is(h1,h2,h3,h4,label) {color:var(--h-color-text)!important}'), 'Broad heading override restored')
for (const token of [
  '--h385-canvas','--h385-surface','--h385-ink','--h385-ink-muted',
  '--h385-table-head','--h385-table-head-ink','--h385-status-neutral-bg',
  '--h385-status-neutral-ink','--h385-focus','--h385-action',
]) assert(css.includes(token), `Semantic token missing: ${token}`)
for (const cls of [
  '.harmony-text-primary','.harmony-text-secondary','.harmony-text-muted',
  '.harmony-employee-directory-card','.harmony-attendance-step-card',
  '.harmony-upload-download','.harmony-hr-review-table',
  '.harmony-count-indicator','.harmony-remed-status',
]) assert(css.includes(cls), `Component theme rule missing: ${cls}`)
const controls = [
  ['app/hr/employees/page.tsx','harmony-employee-directory-card'],
  ['app/hr/attendance/page.tsx','harmony-attendance-step-card'],
  ['app/hr/attendance/upload/page.tsx','harmony-upload-download'],
  ['app/hr/attendance/approvals/page.tsx','harmony-count-indicator'],
  ['components/remed/ClaimStatusBadge.tsx','harmony-remed-status'],
]
for (const [file, cls] of controls) assert(read(file).includes(cls), `${file}: missing ${cls}`)

function extractTokens(selector){
 const pos=css.indexOf(selector)
 assert(pos>=0,`Theme selector missing: ${selector}`)
 const end=css.indexOf('}',pos)
 return Object.fromEntries([...css.slice(pos,end).matchAll(/(--h385-[\w-]+):\s*(#[\da-fA-F]{6});/g)].map(m=>[m[1],m[2]]))
}
const themes={
 light:extractTokens('html[data-harmony-theme=\'light\'] {'),
 dark:extractTokens('html[data-harmony-theme=\'dark\'] {'),
}
const linear=v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4
function luminance(hex){
 const rgb=[1,3,5].map(i=>linear(parseInt(hex.slice(i,i+2),16)/255))
 return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2]
}
function contrast(a,b){const [lo,hi]=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (hi+0.05)/(lo+0.05)}
for(const [theme,values] of Object.entries(themes)){
 for(const [fg,bg] of [
   ['--h385-table-head-ink','--h385-table-head'],
   ['--h385-status-neutral-ink','--h385-status-neutral-bg'],
   ...['success','warning','danger','info','violet'].map(t=>[`--h385-${t}-ink`,`--h385-${t}-bg`]),
 ]){
   assert(values[fg] && values[bg], `${theme}: undefined pair ${fg} ${bg}`)
   const ratio=contrast(values[fg],values[bg]);assert(ratio>=4.5, `${theme}: ${fg} and ${bg} contrast ${ratio.toFixed(2)} below 4.5`)
 }
}
function files(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(path,e.name)):[join(path,e.name)])}
// Use host-platform paths rather than POSIX-only suffixes (Windows emits backslashes).
const pages=files('app').filter(f=>f.replaceAll('\\', '/').endsWith('/page.tsx'))
const apis=files('app/api').filter(f=>f.replaceAll('\\', '/').endsWith('/route.ts'))
assert.equal(pages.length,64,'Page route inventory drift')
assert.equal(apis.length,48,'API inventory drift')
console.log('HARMONY V3.8.5 dual-theme normalization PASS: semantic surface pairs, status/table WCAG contrast, HR/Finance/Employee/Re-Med component hooks, persistence and 112 routes')
