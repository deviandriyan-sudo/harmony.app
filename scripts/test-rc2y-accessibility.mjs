import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const material = read('components/theme/HarmonyMaterialLight.tsx')
const css = read('app/harmony-rc2r-design-system.css')
const layout = read('app/layout.tsx')
const pkg = JSON.parse(read('package.json'))

function has(source, terms, label) {
  for (const term of terms) assert(source.includes(term), `${label}: missing ${term}`)
}

has(material, [
  "matchMedia('(hover: hover) and (pointer: fine)')",
  "matchMedia('(prefers-reduced-transparency: reduce)')",
  "matchMedia('(prefers-contrast: more)')",
  "matchMedia('(prefers-reduced-motion: reduce)')",
  'const mediaQueries = [canHover, reduceTransparency, increaseContrast, reduceMotion]',
  'const enabled = () =>',
  'const syncListeners = () =>',
  "query.addEventListener('change', syncListeners)",
  "query.removeEventListener('change', syncListeners)",
  "document.addEventListener('pointermove', move, { passive: true })",
  "document.removeEventListener('pointermove', move)",
  "document.addEventListener('pointerleave', reset)",
  "document.removeEventListener('pointerleave', reset)",
  "window.addEventListener('blur', reset)",
  "window.removeEventListener('blur', reset)",
  "closest<HTMLElement>('.harmony-liquid-lit')",
  "active.style.setProperty('--harmony-lit', '0')",
  "next.style.setProperty('--harmony-lit', '1')",
], 'Live optical illumination')
assert(!material.includes('if (!canHover.matches || reduceTransparency.matches || increaseContrast.matches || reduceMotion.matches) return'),
  'Do not permanently disable illumination on the initial media state')
assert.equal((material.match(/addEventListener\('pointermove'/g) ?? []).length, 1,
  'Use one delegated pointermove listener only')
assert.equal((layout.match(/<HarmonyMaterialLight \/>/g) ?? []).length, 1,
  'Material light must mount exactly once')
has(css, [
  '.harmony-liquid-lit::before',
  'prefers-reduced-transparency: reduce',
  'prefers-contrast: more',
  'prefers-reduced-motion: reduce',
  '@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px)))',
], 'Existing CSS accessibility fallback')
assert.equal(pkg.scripts['test:rc2y:accessibility'], 'node scripts/test-rc2y-accessibility.mjs')
assert.equal(pkg.dependencies.next, '16.4.6')
assert(!material.includes('fetch(') && !material.includes('innerHTML') && !material.includes('eval('),
  'Pointer illumination must not read or transmit application data')

console.log('RC2Y source guard PASS: live media preference subscription, gated pointer listener, cleanup and existing fallbacks')
