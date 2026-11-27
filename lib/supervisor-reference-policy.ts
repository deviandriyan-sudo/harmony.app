/** Resolve a legacy supervisor reference only when it identifies one active employee.
 * Never treat a shared name, PIN, or cross-field collision as authorization. */
export type SupervisorCandidate = {
  id: string
  employee_number?: string | null
  machine_pin?: string | null
  full_name?: string | null
  email?: string | null
  is_active?: boolean | null
}

const key = (value: unknown) => String(value ?? '').trim().toLowerCase()

export function buildSupervisorReferenceIndex(candidates: readonly SupervisorCandidate[]) {
  const index = new Map<string, Set<string>>()
  for (const candidate of candidates) {
    if (!candidate.id || candidate.is_active === false) continue
    for (const ref of [candidate.id, candidate.employee_number, candidate.machine_pin, candidate.full_name, candidate.email].map(key).filter(Boolean)) {
      const ids = index.get(ref) || new Set<string>()
      ids.add(candidate.id)
      index.set(ref, ids)
    }
  }
  return index
}

export function uniquelyMatchesSupervisor(index: ReadonlyMap<string, ReadonlySet<string>>, reference: unknown, actorId: string): boolean {
  const ids = index.get(key(reference))
  return Boolean(actorId && ids?.size === 1 && ids.has(actorId))
}
