import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const page = read('app/employee/attendance/page.tsx')
const modal = read('components/ui/HarmonyModalPortal.tsx')
const css = read('app/globals.css')

assert(page.includes('import { HarmonyModalPortal } from "@/components/ui/HarmonyModalPortal";'))
for (const [name, titleId] of [
  ['LiveManualAttendanceModal', 'harmony-attendance-live-manual-title'],
  ['EditAttendanceModal', 'harmony-attendance-edit-title'],
]) {
  const start = page.indexOf(`function ${name}(`)
  assert(start >= 0, `Missing ${name}`)
  const end = page.indexOf('\nfunction ', start + 1)
  const body = page.slice(start, end < 0 ? page.length : end)
  assert(body.includes('<HarmonyModalPortal'), `${name}: missing portal`)
  assert(body.includes(`labelledBy="${titleId}"`), `${name}: aria-labelledby`)
  assert(body.includes(`id="${titleId}"`), `${name}: visible heading id`)
  assert(body.includes('onClose={onClose}'), `${name}: close handler must remain`)
  assert(body.includes('canClose={!saving}'), `${name}: prevent dismiss during save`)
  assert(body.includes('className="harmony-attendance-modal"'), `${name}: shared attendance dialog style hook`)
  assert(!body.includes('<div className="harmony-modal-surface fixed'), `${name}: nested overlay regression`)
}
assert(page.includes('onSave={() => saveInlineManualVerification(selectedRow)}'), 'Keep daily attendance save flow')
assert(page.includes('onSave={saveLiveManualAttendance}'), 'Keep live manual attendance save flow')
for (const guard of [
  'createPortal(', 'document.body', 'aria-modal="true"',
  "document.body.style.overflow = 'hidden'", "event.key === 'Escape'", "event.key !== 'Tab'",
]) assert(modal.includes(guard), `Missing shared modal invariant: ${guard}`)
assert(css.includes('body > .harmony-modal-surface {'), 'Must retain body-attached overlay CSS')
assert(css.includes('z-index:2140 !important;'), 'Must retain z-index above topbar')
console.log('PASS: Attendance dialogs use body portal; topbar stacking is bypassed, accessible keyboard/focus and save flows preserved.')
