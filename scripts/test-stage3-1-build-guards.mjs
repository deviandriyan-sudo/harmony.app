import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const read = path => readFileSync(path, 'utf8')
const layout = read('app/layout.tsx')
const globalCss = read('app/globals.css')
const phl = read('lib/server/phl-work.ts')
const themeTest = read('scripts/test-theme-normalization.mjs')

assert(!layout.includes('next/font/google'), 'Offline build should not depend on Google Fonts')
assert(!layout.includes('geistSans') && !layout.includes('geistMono'), 'Removed font loaders still referenced')
assert(globalCss.includes('--font-geist-sans:') && globalCss.includes('--font-geist-mono:'), 'Fallback font variables missing')
assert(phl.includes('function formatDate(value: string | null | undefined)'), 'PHL formatter must accept nullable dates')
assert(phl.includes("if (!dateValue) return '-'"), 'PHL formatter must provide a fallback')
assert(themeTest.includes('replaceAll(') && themeTest.includes('page.tsx'), 'Theme test still relies on POSIX-only route paths')

function files(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const next = join(path, entry.name)
    return entry.isDirectory() ? files(next) : [next]
  })
}
assert(existsSync('app/api'))
assert.equal(files('app').filter(path => basename(path) === 'page.tsx').length, 64)
assert.equal(files('app/api').filter(path => basename(path) === 'route.ts').length, 48)
console.log('HARMONY Stage 3.1 build guards PASS: nullable PHL date, offline-safe fonts, cross-platform route enumeration, 112 routes')
