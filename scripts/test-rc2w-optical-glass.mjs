import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path,'utf8')
const css = read('app/harmony-rc2r-design-system.css')
const material = read('components/theme/HarmonyMaterialLight.tsx')
const layout = read('app/layout.tsx')
const pkg = JSON.parse(read('package.json'))
const license = read('docs/licenses/GLASS_UI_MIT.txt')

const must = (src, values, name) => {
  for (const value of values) {
    assert(src.includes(value), name + ': missing ' + value)
  }
}

must(css, [
  'Seven-layer optics adapted from AndreyBegma/glass-ui',
  '--harmony-glass-scrim:', '--harmony-glass-scrim-strong:',
  '--harmony-glass-sheen:', '--harmony-glass-spec:',
  '--harmony-glass-rim-light:', '--harmony-glass-rim-shade:',
  '--harmony-glass-meniscus:', '--harmony-glass-refract:',
  '--harmony-glass-drop:', '--harmony-glass-lit:',
  '--harmony-glass-filter:', '--harmony-glass-filter-strong:',
  '--harmony-glass-content:', '--harmony-glass-ambient:',
  '--harmony-glass-chrome-shadow:', '--harmony-glass-strong-shadow:',
  '--harmony-glass-content-bg:',
  ":root, html[data-harmony-theme='light'], html[data-harmony-theme='dark']",
  'brightness(1.08)','brightness(.85)',
  '.harmony-liquid-lit::before','var(--harmony-glass-lit)',
  '.harmony-sidebar-panel,.harmony-topbar,.harmony-module-subnav',
  'body > .harmony-leave-request-modal .harmony-leave-modal-panel',
  'prefers-reduced-transparency: reduce','prefers-contrast: more',
  'prefers-reduced-motion: reduce',
  '@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px)))',
], 'Optical CSS')

must(material, [
  "'use client'",'useEffect','addEventListener(\'pointermove\'',
  "removeEventListener('pointermove'",'getBoundingClientRect',
  "closest<HTMLElement>('.harmony-liquid-lit')",
  "matchMedia('(hover: hover) and (pointer: fine)')",
  "matchMedia('(prefers-reduced-motion: reduce)')",
  "matchMedia('(prefers-reduced-transparency: reduce)')",
], 'Delegated MaterialLight')
must(layout, ['import { HarmonyMaterialLight }','<HarmonyMaterialLight />'],
  'Root layout')
assert.equal((layout.match(/<HarmonyMaterialLight \/>/g) || []).length,1,
  'Material light must mount once only')
for(const path of [
  'components/layout/Topbar.tsx',
  'components/layout/AppSidebar.tsx',
  'components/layout/ModuleSubnav.tsx',
  'components/theme/ThemeToggle.tsx',
  'app/employee/dashboard/page.tsx',
  'app/hr/dashboard/page.tsx',
]){
  must(read(path),['harmony-liquid-lit'],path)
}
must(license,['Copyright (c) 2026 AndreyBegma','Permission is hereby granted'],
  'Third-party source notice')
must(read('app/employee/attendance/page.tsx'),
  ['handleSubmitPeriod','toggleSelectAllAttendance',
   'isFutureUnrecordedCalendarDay','registerHarmonySubmissionAttachments'],
  'Attendance workflow')
must(read('app/employee/approvals/phl/page.tsx'),
  ['phlWorkApprovalExpired(item.work_date)'],'PHL expiry guard')
must(read('app/employee/leave/page.tsx'),['harmony-leave-modal-panel','onClick={openForm}'],
  'Leave dialog')
must(read('components/ui/HarmonyModalPortal.tsx'),
  ['createPortal(', 'aria-modal="true"','handleKeyDown'],'Modal portal')
assert(!css.includes('url(http') && !css.includes('@import'), 'No remote CSS')
assert(!material.includes('fetch(') && !material.includes('eval(') &&
  !material.includes('innerHTML'), 'No network or HTML injection in material code')
assert.equal(pkg.scripts['test:rc2w:glass'],
  'node scripts/test-rc2w-optical-glass.mjs')
assert.equal(pkg.dependencies.next,'16.4.6','Framework baseline unchanged')

let braces=0
for(const char of css.replace(/\/\*[\s\S]*?\*\//g,'')){
  if(char==='{') braces++
  if(char==='}') braces--
  assert(braces>=0,'Malformed CSS closing brace')
}
assert.equal(braces,0,'Unbalanced CSS')
console.log('RC2W open-source optical glass PASS: MIT source, seven material layers, dynamic light, light/dark, a11y and workflow guards')
