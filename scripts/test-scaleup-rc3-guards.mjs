import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = (path) => readFileSync(path, 'utf8')
const quotaSource = read('lib/server/email-quota.ts')
const quotaJs = ts.transpileModule(quotaSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const instance = { exports: {} }
new Function('module','exports',quotaJs)(instance,instance.exports)
const { isDailyEmailQuotaError, quotaRetryAt } = instance.exports
assert.equal(isDailyEmailQuotaError('You have reached your daily email sending quota.'), true)
assert.equal(isDailyEmailQuotaError('Rate limit: 2 requests per second'), false)
assert.equal(isDailyEmailQuotaError('Provider unavailable'), false)
assert.equal(quotaRetryAt(0), new Date(86_400_000).toISOString())
const candidates = read('app/api/scaleup/candidates/route.ts')
assert.match(candidates, /\.eq\('is_active', true\)\.neq\('id', requester\)/)
assert.match(candidates, /\.range\(page \* limit, page \* limit \+ limit - 1\)/)
assert.match(candidates, /scaleup_is_eligible_v1/)
assert.match(read('app/employee/layout.tsx'), /remed: true/)
assert.match(read('app/hr/layout.tsx'), /remed: true/)
assert.match(read('app/api/scaleup/route.ts'),/scaleup:submit:/)
assert.match(read('app/api/scaleup/route.ts'),/scheduleHarmonyJobQueueDrain/)
assert.match(read('app/api/remed/hr/entitlements/route.ts'),/Plafond dasar tahun ini belum diatur/)
console.log('HARMONY RC3 guards PASS: manual directory, executive eligibility, Re-Med navigation, initial mail queue, quota cooldown')
