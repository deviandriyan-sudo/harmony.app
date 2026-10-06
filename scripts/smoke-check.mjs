import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appDir = path.join(root, 'app')
const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

function normalizeRoute(file) {
  let rel = path.relative(appDir, path.dirname(file)).replaceAll(path.sep, '/')
  rel = rel
    .split('/')
    .filter((segment) => segment && !(segment.startsWith('(') && segment.endsWith(')')))
    .join('/')
  return '/' + rel
}

assert(fs.existsSync(appDir), 'Folder app/ tidak ditemukan.')
assert(!fs.existsSync(path.join(root, '.next')), '.next tidak boleh berada di source release.')
assert(!fs.existsSync(path.join(root, 'tsconfig.tsbuildinfo')), 'tsconfig.tsbuildinfo tidak boleh berada di source release.')

const requiredFiles = [
  'app/login/page.tsx',
  'app/hr/layout.tsx',
  'app/employee/layout.tsx',
  'app/remed/layout.tsx',
  'app/api/auth/access/route.ts',
  'app/api/health/route.ts',
  'app/hr/settings/system-health/page.tsx',
  'lib/server/user-api-auth.ts',
  'lib/server/hr-api-auth.ts',
  'lib/server/remed-api-auth.ts',
  'lib/harmony-client.ts',
  'lib/version.ts',
]

for (const file of requiredFiles) {
  assert(fs.existsSync(path.join(root, file)), `File wajib hilang: ${file}`)
}

const allAppFiles = walk(appDir)
const routeFiles = allAppFiles.filter((file) => /\/(page|route)\.(tsx?|jsx?)$/.test(file.replaceAll('\\', '/')))
const pageRoutes = new Map()
const apiRoutes = new Map()

for (const file of routeFiles) {
  const route = normalizeRoute(file)
  const isApi = path.basename(file).startsWith('route.')
  const map = isApi ? apiRoutes : pageRoutes
  if (map.has(route)) failures.push(`Duplicate ${isApi ? 'API' : 'page'} route: ${route}`)
  else map.set(route, file)
}

const forbiddenPaths = [
  '/hr/workforce',
  '/hr/attendance/security',
]
for (const route of [...pageRoutes.keys(), ...apiRoutes.keys()]) {
  for (const forbidden of forbiddenPaths) {
    assert(!route.startsWith(forbidden), `Route outsource HOLD masih aktif: ${route}`)
  }
}

const sourceText = walk(root)
  .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file) && !file.includes(`${path.sep}.next${path.sep}`) && !file.includes(`${path.sep}scripts${path.sep}`))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')

assert(!sourceText.includes(['security','shift','detection'].join('-')), 'Legacy security-shift-detection masih ditemukan.')
assert(sourceText.includes("'/api/auth/access'"), 'Server access guard belum direferensikan.')
assert(sourceText.includes("'/api/health'"), 'System Health belum direferensikan.')

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
assert(pkg.version === '3.0.0', `package.json version harus 3.0.0, saat ini ${pkg.version}`)
assert(Boolean(pkg.scripts?.['test:smoke']), 'Script test:smoke belum tersedia.')

if (failures.length) {
  console.error(`HARMONY smoke check FAILED (${failures.length})`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('HARMONY smoke check PASSED')
console.log(`Pages: ${pageRoutes.size}`)
console.log(`API routes: ${apiRoutes.size}`)
console.log(`Total routes: ${pageRoutes.size + apiRoutes.size}`)
