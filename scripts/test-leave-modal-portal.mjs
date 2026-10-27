import fs from 'node:fs'
import assert from 'node:assert/strict'

const read = path => fs.readFileSync(path,'utf8')
const page = read('app/employee/leave/page.tsx')
const portal = read('components/ui/HarmonyModalPortal.tsx')
const css = read('app/globals.css')
assert(page.includes('HarmonyModalPortal labelledBy={titleId} onClose={onClose} canClose={!submitting}'), 'Leave modal must use the accessible body portal and remain locked while submitting')
assert(page.includes('id={titleId}'), 'Dialog must have accessible title')
assert(!page.includes('className="harmony-modal-surface fixed inset-0 z-50'), 'Leave dialog still uses a nested fixed overlay')
for (const token of ['createPortal(', 'document.body', "document.body.style.overflow = 'hidden'", "event.key === 'Escape'", "event.key !== 'Tab'", "previouslyFocused.focus(", 'aria-modal="true"']) {
 assert(portal.includes(token), `Missing modal accessibility invariant: ${token}`)
}
for (const token of ['body > .harmony-modal-surface.harmony-leave-request-modal','z-index: 2145 !important','body > .harmony-leave-request-modal .harmony-leave-submit','.harmony-leave-summary-grid']) {
 assert(css.includes(token),`Missing leave modal/style safeguard: ${token}`)
}
assert(page.includes('countCalendarDays(form.start_date, form.end_date)'),'PHL calendar-day logic must remain unchanged')
assert(page.includes('/api/employee/phl-claims'),'PHL submission must remain server routed')
console.log('HARMONY leave-modal portal PASS: layering, keyboard, scroll lock, visual controls, untouched PHL flow')
