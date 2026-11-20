import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Compile the pure TypeScript URL parser in memory: works with Node 20+, no TS loader needed.
const recoveryModule = ts.transpileModule(readFileSync('lib/auth-recovery.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { parseRecoveryCallback, clearRecoveryCredentialsFromUrl } = await import(
  `data:text/javascript;base64,${Buffer.from(recoveryModule).toString('base64')}`
)

const root = 'https://harmony.example/reset-password'
assert.equal(parseRecoveryCallback(root).kind, 'none', 'Unrelated login session cannot pass recovery gate')
assert.equal(parseRecoveryCallback(`${root}?flow=recovery`).kind, 'session-marker')
assert.deepEqual(parseRecoveryCallback(`${root}?token_hash=VALID&type=recovery`), { kind:'otp', tokenHash:'VALID' })
assert.equal(parseRecoveryCallback(`${root}?token_hash=VALID&type=signup`).kind, 'none')
assert.deepEqual(parseRecoveryCallback(`${root}?code=ONETIME`), { kind:'pkce', code:'ONETIME' })
assert.deepEqual(parseRecoveryCallback(`${root}#access_token=AAA&refresh_token=BBB&type=recovery`), { kind:'implicit', accessToken:'AAA', refreshToken:'BBB' })
assert.equal(parseRecoveryCallback(`${root}#access_token=AAA&refresh_token=BBB&type=signup`).kind, 'none')
assert.equal(parseRecoveryCallback(`${root}?error=access_denied`).kind, 'error')
assert.equal(clearRecoveryCredentialsFromUrl(`${root}?flow=recovery&token_hash=SECRET&type=recovery#access_token=SECRET`), '/reset-password?flow=recovery')
assert.equal(clearRecoveryCredentialsFromUrl(`${root}?code=SECRET&next=foo`), '/reset-password?next=foo')
const login = readFileSync('app/login/page.tsx', 'utf8')
const reset = readFileSync('app/reset-password/page.tsx', 'utf8')
const layout = readFileSync('app/layout.tsx', 'utf8')
const css = readFileSync('app/theme-contrast-rc2n.css', 'utf8')
assert(login.includes('/reset-password?flow=recovery'))
assert(reset.includes("event === 'PASSWORD_RECOVERY'"))
assert(reset.includes('verifyOtp(') && reset.includes('exchangeCodeForSession(') && reset.includes('setSession('))
assert(reset.includes('getUser()'), 'Authenticated reset session must be validated')
assert(!reset.includes('if (data.session) {\n        setHasRecoverySession(true)'), 'Any existing session must not authorize recovery')
assert(layout.includes("import './theme-contrast-rc2n.css'"))
for (const part of ["@media screen", '.harmony-workspace', '.harmony-modal-surface', '.harmony-action-soft', '.harmony-public-shell', '--h385-ink']) {
 assert(css.includes(part), `missing theme feature ${part}`)
}
assert(!css.includes('harmony-print-document {'), 'Print styling must remain independent')
console.log('RC2N password recovery and theme guards PASS (callback variants, session gating, URL stripping, CSS scope)')
