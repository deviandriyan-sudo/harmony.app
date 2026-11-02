/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS mock harness */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function makeTable(claims) {
  return {
    select(columns, options = {}) {
      const query = {
        filters: [], columns, options, rangeValue: null, limitValue: null,
        eq(column, value) { this.filters.push(row => row[column] === value); return this },
        in(column, values) { this.filters.push(row => values.includes(row[column])); return this },
        order() { return this },
        range(from, to) { this.rangeValue = [from, to]; return this },
        limit(value) { this.limitValue = value; return this },
        then(resolve, reject) {
          let rows = claims.filter(row => this.filters.every(fn => fn(row)))
          const count = options.count === 'exact' ? rows.length : null
          if (this.limitValue !== null) rows = rows.slice(0, this.limitValue)
          if (this.rangeValue) rows = rows.slice(this.rangeValue[0], this.rangeValue[1] + 1)
          if (this.options.head) rows = []
          else if (columns !== '*') {
            const keys = columns.split(',')
            rows = rows.map(row => Object.fromEntries(keys.map(key => [key, row[key]])))
          }
          return Promise.resolve({ data: rows, count, error: null }).then(resolve, reject)
        },
      }
      return query
    },
  }
}

const compiled = ts.transpileModule(fs.readFileSync('app/api/remed/dashboard/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

async function checkRole(role) {
  const claims = Array.from({ length: 1_207 }, (_, i) => ({
    id: String(i).padStart(6, '0'),
    status: i < 1_005 ? 'paid' : i < 1_100 ? 'pending_hr' : i < 1_170 ? 'pending_finance' : 'waiting_payment',
    approved_amount: i % 5 === 0 ? 0 : i * 35,
    submitted_amount: i * 21 + 100,
    created_at: new Date(2_026, 0, 1, 0, 0, i).toISOString(),
  }))
  const context = {
    access: { role },
    admin: { from(table) { assert.equal(table, 'remed_claims'); return makeTable(claims) } },
  }
  const mockModule = { exports: {} }
  const sandbox = {
    module: mockModule, exports: mockModule.exports,
    require(moduleName) {
      if (moduleName === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } }
      if (moduleName === '@/lib/server/remed-api-auth') return {
        requireRemedApi: async () => context,
        remedApiError: err => ({ status: err.status || 500, message: err.message }),
      }
      if (moduleName === '@/lib/server/remed-data') return { enrichRemedClaims: async (_, recent) => recent }
      throw Error(`Unexpected import ${moduleName}`)
    },
  }
  vm.runInNewContext(compiled, sandbox, { filename: 'dashboard.js' })
  const result = await mockModule.exports.GET({})
  assert.equal(result.status, 200)
  const expected = claims.filter(x => x.status === 'paid')
    .reduce((sum, x) => sum + Number(x.approved_amount || x.submitted_amount || 0), 0)
  assert.equal(result.body.stats.paidTotal, expected)
  assert.equal(result.body.stats.paidCount, 1005)
  assert.equal(result.body.stats.totalClaims, claims.length)
  assert.equal(result.body.stats.pending, role === 'hr' ? 95 : 107)
  assert.equal(result.body.recentClaims.length, 8)
}

Promise.all([checkRole('hr'), checkRole('finance')])
  .then(() => console.log('Stage 9 dashboard mocked API test PASS: HR/Finance, totals, pending, 1005 paid, recent 8'))
  .catch(error => { console.error(error); process.exitCode = 1 })
