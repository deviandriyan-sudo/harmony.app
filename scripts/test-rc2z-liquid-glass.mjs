import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(file, 'utf8')
const glass = read('app/harmony-rc2z-liquid-glass.css')
const layout = read('app/layout.tsx')
const pkg = JSON.parse(read('package.json'))
const required = [
  "html[data-harmony-theme='light']",
  "html[data-harmony-theme='dark']",
  '--hgl-atmosphere:', '--hgl-chrome:', '--hgl-sheet:', '--hgl-metric:',
  '--hgl-input:', '--hgl-table-head:', '--hgl-primary:',
  '.harmony-sidebar-panel', '.harmony-topbar', '.harmony-mobile-topbar',
  '.harmony-module-subnav', '.harmony-sidebar-nav', '.harmony-topbar-search',
  '.harmony-rc2q-employee-hero', '.harmony-glass-role-hero', '.scaleup-hero',
  '.harmony-rc2q-attendance-panel', '.harmony-rc2q-approved-metric',
  '.harmony-metric-card', '.harmony-card', '.harmony-team-history',
  '.harmony-button-primary', '.harmony-button-secondary', '.scaleup-primary',
  '.harmony-workspace', 'table', 'thead', 'tbody tr:hover',
  '.harmony-modal-surface', '.harmony-hr-edit-modal', '.harmony-login-shell',
  '.harmony-leave-modal-panel', '.harmony-liquid-lit::before',
  'prefers-reduced-motion: reduce',
  'prefers-reduced-transparency: reduce', 'prefers-contrast: more',
  '@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px)))',
  "input:not([type='checkbox']):not([type='radio']):not([type='file'])",
]
for (const token of required) {
  assert(glass.includes(token), `Missing RC2Z design-system integration: ${token}`)
}
assert(glass.trimStart().startsWith('/*'), 'Keep an explicit design-system header')
assert(glass.includes('@media screen {'), 'RC2Z must not modify print styles')
assert(!glass.includes('@media print'), 'Print rules are out of scope')
assert(!glass.includes('@import') && !glass.includes('url(http'), 'No remote CSS imports')
assert(!glass.includes('!important; } /* bypass'), 'Do not bypass existing guards')
assert(layout.includes("import './harmony-rc2r-design-system.css'\nimport './harmony-rc2z-liquid-glass.css'"),
  'RC2Z is one final imported material layer after RC2R')
assert.equal((layout.match(/harmony-rc2z-liquid-glass\.css/g) || []).length, 1,
  'RC2Z stylesheet must be imported once')
assert.equal(pkg.scripts['test:rc2z:glass'], 'node scripts/test-rc2z-liquid-glass.mjs')
assert.equal(pkg.dependencies.next, '16.4.6')
assert(!pkg.dependencies['next-themes'] && !pkg.dependencies['liquid-glass-react'],
  'Do not introduce a competing theme runtime or shader')
let depth = 0
for (const char of glass.replace(/\/\*[\s\S]*?\*\//g, '')) {
  if (char === '{') depth++
  if (char === '}') depth--
  assert(depth >= 0, 'Unexpected CSS closing brace')
}
assert.equal(depth, 0, 'CSS braces must be balanced')
console.log('RC2Z Liquid Glass source guard PASS: comprehensive material surfaces, tokens, themes, readable input/table, a11y and print isolation')
