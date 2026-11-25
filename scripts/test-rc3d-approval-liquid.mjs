import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const page = read('app/employee/approvals/page.tsx')
const css = read('app/employee/approvals/approval-rc3c.css')
const subnav = read('components/layout/ModuleSubnav.tsx')
const signature = (text) => createHash('sha256').update(text).digest('hex')

assert.match(page, /import '\.\/approval-rc3c\.css'/)
assert.match(page, /ApprovalLiquidToolbar/)
assert.match(page, /harmony-approval-toolbar/)
assert.doesNotMatch(page, /Ringkasan persetujuan/)
assert.doesNotMatch(page, /<PeriodFilterBar/)
assert.ok(page.indexOf('<ApprovalLiquidToolbar') < page.indexOf('harmony-approval-module-grid'))
assert.ok(page.indexOf('harmony-approval-module-grid') < page.indexOf('<SubordinateOrgChart'))
assert.match(page, /<details className="harmony-card harmony-approval-directory">/)
for (const route of ['/employee/approvals/attendance?period=', '/employee/approvals/leave', '/employee/approvals/phl?status=']) {
  assert.ok(page.includes(route), `Missing workflow destination: ${route}`)
}
for (const token of ['harmony_supervisor_get_phl_claims_v1','fetchPHLWorkRequests(\'team\')','buildSubordinateRelationMap(','supervisor_1','supervisor_2']) {
  assert.ok(page.includes(token), `Missing approval integrity token: ${token}`)
}

const fetchStart = page.indexOf('  async function fetchData() {')
const fetchEnd = page.indexOf('\n  return (\n    <>', fetchStart)
assert.ok(fetchStart >= 0 && fetchEnd > fetchStart)
assert.equal(signature(page.slice(fetchStart, fetchEnd)), '5b4967fc50e17514a34b6514821ef9c90bd8c6243eb8a24219499700597327f1', 'Approval data fetcher changed — review required')
const helperStart = page.indexOf('function supervisorIdentitySet(')
assert.ok(helperStart >= 0)
assert.equal(signature(page.slice(helperStart)), 'a17acfe76b27afab5c66b960890d3e22fd6e2066be8eaf4eb939eacb2731bea7', 'Supervisor authorization/relationship helpers changed — review required')

assert.ok(css.includes('harmony-approval-toolbar'))
for (const token of ['border-radius: 34px', 'harmony-approval-module-grid', 'harmony-approval-module-metric', 'prefers-reduced-motion', 'prefers-reduced-transparency']) {
  assert.ok(css.includes(token), `Missing liquid-glass token: ${token}`)
}
assert.doesNotMatch(css, /@import|url\(https?:|@media print/i)
assert.ok(subnav.includes("pathname==='/employee/approvals'"), 'Module subnav should be hidden on approval summary page so global search remains top-most')
console.log('RC3D Approval Liquid PASS — summary and period cards removed, compact toolbar retained, top search preserved, liquid glass applied, original workflow and relationship checks preserved.')
