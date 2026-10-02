import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function parseEnv(text) {
  const result = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx < 1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

const projectRoot = process.cwd()
const envPath = path.join(projectRoot, '.env.local')
const seedDir = path.join(projectRoot, '_setup', '_private_signature_seed')
const env = parseEnv(await fs.readFile(envPath, 'utf8'))
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local.')
}

const map = JSON.parse(await fs.readFile(path.join(seedDir, 'map.json'), 'utf8'))
const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const numbers = map.map((x) => x.employee_number)
const { data: employees, error: employeeError } = await client
  .from('employees')
  .select('id,employee_number,full_name')
  .in('employee_number', numbers)
if (employeeError) throw employeeError

const employeeMap = new Map((employees || []).map((employee) => [String(employee.employee_number), employee]))
const ids = (employees || []).map((employee) => employee.id)
let profiles = []
if (ids.length) {
  const profileResult = await client
    .from('remed_signature_profiles')
    .select('employee_id,signature_path,signature_origin')
    .in('employee_id', ids)
  if (profileResult.error) throw profileResult.error
  profiles = profileResult.data || []
}
const profileMap = new Map(profiles.map((profile) => [profile.employee_id, profile]))

const result = { imported: 0, skippedCustom: 0, missingEmployee: 0, failed: 0 }

for (const seed of map) {
  const employee = employeeMap.get(seed.employee_number)
  if (!employee) {
    result.missingEmployee += 1
    console.log(`[MISSING] ${seed.employee_number}`)
    continue
  }

  const current = profileMap.get(employee.id)
  if (current?.signature_path && current?.signature_origin === 'upload') {
    result.skippedCustom += 1
    console.log(`[SKIP CUSTOM] ${seed.employee_number} ${employee.full_name}`)
    continue
  }

  try {
    const filePath = path.join(seedDir, seed.file)
    const buffer = await fs.readFile(filePath)
    const ext = path.extname(seed.file).toLowerCase()
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png'
    const storagePath = `seed/${employee.id}-${seed.file}`

    const upload = await client.storage
      .from('remed-signatures')
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true })
    if (upload.error) throw upload.error

    const upsert = await client
      .from('remed_signature_profiles')
      .upsert({
        employee_id: employee.id,
        signature_path: storagePath,
        signature_origin: 'seed',
        signature_file_name: seed.original_name || seed.file,
        signature_mime_type: mimeType,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'employee_id' })
    if (upsert.error) throw upsert.error

    result.imported += 1
    console.log(`[OK] ${seed.employee_number} ${employee.full_name}`)
  } catch (error) {
    result.failed += 1
    console.error(`[FAILED] ${seed.employee_number} ${employee.full_name}: ${error?.message || error}`)
  }
}

console.log('\n=== RE-MED SIGNATURE SEED RESULT ===')
console.log(JSON.stringify(result, null, 2))
if (result.failed > 0) process.exitCode = 1
