import assert from 'node:assert/strict'
import fs from 'node:fs'

const login = fs.readFileSync('app/login/page.tsx', 'utf8')
const css = fs.readFileSync('app/globals.css', 'utf8')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))

// Preserve the working authentication contract and role routing.
for (const required of [
  'supabase.auth.signInWithPassword',
  'supabase.auth.signInWithOAuth',
  'supabase.auth.resetPasswordForEmail',
  'supabase.auth.getUser',
  "'/api/auth/access'",
  "'/api/remed/session'",
  "'/api/system/status'",
  'redirectAuthenticatedUser()',
  'router.replace(result.home)',
  'setShowPassword((current) => !current)',
  'disabled={loading || googleLoading}',
  'role={messageType',
  'src="/logo.png"',
]) assert(login.includes(required), `Missing login/auth invariant: ${required}`)

// All animation is scoped to login and respects reduced-motion preferences.
for (const required of [
  '.harmony-login-v383',
  '.harmony-login-shutter--left',
  '.harmony-login-shutter--right',
  'harmony-login-open-left',
  'harmony-login-open-right',
  'harmony-login-shell-arrive',
  'harmony-login-rise',
  '@media (prefers-reduced-motion:reduce)',
  '@media (prefers-reduced-transparency:reduce)',
  '.harmony-login-field:focus-within',
  '@media (max-width:760px)',
]) assert(css.includes(required), `Missing login motion/responsive selector: ${required}`)

assert(login.includes('harmony-login-shutter--left') && login.includes('harmony-login-shutter--right'), 'Opening shutters not rendered')
assert.equal(pkg.version, lock.version, 'Package and lockfile version diverged')
assert.equal(pkg.version, lock.packages[''].version, 'Lockfile root version diverged')
assert(!('framer-motion' in pkg.dependencies) && !('motion' in pkg.dependencies), 'Unexpected new dependency')
console.log('HARMONY login motion PASS: unfold animation, reduced motion, responsive hooks, auth and role routing invariants')
