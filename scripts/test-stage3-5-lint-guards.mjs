import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const upload = read('app/hr/attendance/upload/page.tsx')
const topbar = read('components/layout/Topbar.tsx')

// Preview re-evaluates when file, directory, or schedule changes, but the
// effect itself cannot synchronously call a state-changing async parser.
assert.match(upload, /useEffectEvent\(async \(file: File, isCurrent: \(\) => boolean\)/)
assert.match(upload, /queueMicrotask\(\(\) => \{\s*if \(active\) void onRefreshUploadPreview\(selectedFile, \(\) => active\)/)
assert.match(upload, /return \(\) => \{ active = false \}/)
assert.match(upload, /\[selectedFile, employees, workSchedule\]/)
assert.equal((upload.match(/if \(!isCurrent\(\)\) return/g) || []).length, 2)
assert.doesNotMatch(upload, /async function handleFileChange\(/, 'duplicate async file parsing was removed')
assert.match(upload, /onConflict: 'machine_pin,attendance_date'/, 'incremental merge invariant preserved')
assert.match(upload, /processAttendanceUploadEmails/, 'notification queue preserved')
assert.match(upload, /hasEmployeeProtectedAttendanceData/, 'fingerprint-protected merge preserved')

// Navigation uses the browser's navigation API, not mutation of global location.
assert.equal((topbar.match(/window\.location\.assign\(/g) || []).length, 2)
assert.doesNotMatch(topbar, /window\.location\.href\s*=/)
// The relative-time clock is updated by a timer, never read during render.
const relativeTimeFunction = topbar.split('  function getRelativeTime(')[1]?.split('\n  return (')[0]
assert.ok(relativeTimeFunction, 'relative time formatter still available')
assert.doesNotMatch(relativeTimeFunction, /Date\.now\(/)
assert.match(relativeTimeFunction, /relativeTimeNow/)
assert.match(topbar, /const timer = window\.setInterval\(tick, TASK_REFRESH_MS\)/)
assert.match(topbar, /window\.clearInterval\(timer\)/)
assert.match(topbar, /harmony-notification-panel/)
assert.match(topbar, /markAllTasksRead/)
assert.match(topbar, /handleMarkAsRead/)

console.log('HARMONY Stage 3.5 lint guards PASS: preview effect, stale-file guard, browser navigation, pure relative-time render, notification and upload flow invariants')
