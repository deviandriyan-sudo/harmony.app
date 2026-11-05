import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const form = read('components/remed/PaymentRequestPrint.tsx')
const css = read('app/remed-payment-print.css')
const root = read('app/layout.tsx')

assert.match(root, /import '\.\/remed-payment-print\.css'/, 'Dedicated Re-Med print CSS must be imported')
for (const cls of ['remed-print-page', 'remed-payment-sheet', 'remed-print-head',
  'remed-print-profile-grid', 'remed-print-dual-grid', 'remed-print-summary-grid',
  'remed-print-approvals', 'remed-print-signature']) {
  assert.ok(form.includes(cls), `Missing document print hook: ${cls}`)
  assert.ok(css.includes(cls), `Missing print rule: ${cls}`)
}
assert.match(css, /@media print\s*\{/, 'Styles must not change screen presentation')
assert.match(css, /max-width:\s*180mm\s*!important/, 'Printable width should honor 15mm A4 page margins')
assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/, 'Three signatures must be printable')
assert.match(css, /overflow-wrap:\s*anywhere/, 'Long claim numbers and employee names must wrap')
assert.match(css, /background:\s*#fff\s*!important/, 'Print background must be white')
assert.match(css, /background-image:\s*none\s*!important/, 'Glass gradients must not be printed')
assert.match(css, /body:has\(\.remed-print-page\)/, 'Layout overrides must be scoped to Re-Med print page')
assert.doesNotMatch(css, /(?<!\w)@page\b/, 'Do not override page margins for unrelated SCALE UP print forms')
for (const role of ['hr', 'finance']) {
  const route = read(`app/remed/${role}/claims/[id]/print/page.tsx`)
  assert.match(route, /PaymentRequestPrint/, `${role} printable page must reuse shared form`)
}
assert.match(form, /signature\?\.signature_url/, 'Signature display must be preserved')
assert.match(form, /remedFetch<\{ claim: RemedClaim/, 'Actual Re-Med claim endpoint must remain the source of data')
console.log('HARMONY Re-Med print guard PASS: A4 safe area, neutral paper, responsive grids, signatures, isolated CSS and both print routes (static source test).')
