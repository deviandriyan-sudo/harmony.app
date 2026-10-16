import { supabase } from '@/lib/supabase'

// Matches Approval Tim's supervisor identities and active homebase/assignment relations.
// UI visibility is not authorization; server-side guards remain authoritative.
let cacheId = ''
let cache: Promise<boolean> | null = null
export function hasSupervisorAssignments(employeeId: string): Promise<boolean> {
  if (!employeeId) return Promise.resolve(false)
  if (cacheId === employeeId && cache) return cache
  cacheId = employeeId
  cache = query(employeeId).catch(() => false)
  return cache
}
async function query(employeeId: string) {
  const self = await supabase.from('employees').select('id,full_name,employee_number,machine_pin,email').eq('id', employeeId).maybeSingle()
  if (self.error || !self.data) return false
  const identities = [self.data.id, self.data.full_name, self.data.employee_number, self.data.machine_pin, self.data.email]
    .map(value => String(value || '').trim().toLowerCase()).filter(Boolean)
  const [people, assignments] = await Promise.all([
    supabase.from('employees').select('id,supervisor_1,supervisor_2').eq('is_active', true),
    supabase.from('employee_assignments').select('employee_id,supervisor_1,supervisor_2,start_date,end_date,is_primary,is_active').eq('is_active', true),
  ])
  if (people.error || assignments.error) return false
  const matches = (value: unknown) => identities.includes(String(value || '').trim().toLowerCase())
  const personnel = people.data || []
  const peopleIds = new Set(personnel.map(person => person.id))
  if (personnel.some(person => person.id !== employeeId && (matches(person.supervisor_1) || matches(person.supervisor_2)))) return true
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return (assignments.data || []).some(row => row.employee_id !== employeeId && peopleIds.has(row.employee_id) && row.is_primary !== true && (!row.start_date || row.start_date <= today) && (!row.end_date || row.end_date >= today) && (matches(row.supervisor_1) || matches(row.supervisor_2)))
}
