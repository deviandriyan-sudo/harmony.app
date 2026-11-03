/** SCALE UP approval planning. No employee identities are ever inferred or auto-selected. */
export const SCALEUP_ROLE_KEYS = ['supervisor_1', 'supervisor_2', 'wadirsdk', 'finance', 'director'] as const
export type ScaleupRole = (typeof SCALEUP_ROLE_KEYS)[number]
export type Nominees = { supervisor_1: string; supervisor_2?: string | null; wadirsdk: string; finance: string; director?: string | null }
export type ApprovalStage = { order: number; approver_employee_id: string; obligations: ScaleupRole[]; label: string }
export type ApprovalPolicy = { mandatory_roles: ScaleupRole[]; executive_order: ScaleupRole[]; merge_supervisor_executive: boolean; director_when_supervisor: boolean }
export const DEFAULT_SCALEUP_POLICY: ApprovalPolicy = {
  mandatory_roles: ['supervisor_1', 'wadirsdk', 'finance'],
  executive_order: ['wadirsdk', 'finance', 'director'],
  merge_supervisor_executive: true,
  director_when_supervisor: true,
}
export const ROLE_LABELS: Record<ScaleupRole, string> = {
  supervisor_1: 'Atasan 1', supervisor_2: 'Atasan 2', wadirsdk: 'Wadir Sumber Daya dan Kelembagaan', finance: 'Wadir Keuangan', director: 'Direktur',
}
export function normalizePolicy(value: unknown): ApprovalPolicy {
  const v = (value || {}) as Partial<ApprovalPolicy>
  const valid = (x: unknown): x is ScaleupRole => SCALEUP_ROLE_KEYS.includes(x as ScaleupRole)
  const mandatory = Array.isArray(v.mandatory_roles) ? v.mandatory_roles.filter(valid) : DEFAULT_SCALEUP_POLICY.mandatory_roles
  const rawOrder = Array.isArray(v.executive_order) ? v.executive_order.filter(valid).filter(x => !x.startsWith('supervisor')) : DEFAULT_SCALEUP_POLICY.executive_order
  const order = [...new Set([...rawOrder, 'wadirsdk', 'finance', 'director'])] as ScaleupRole[]
  return {
    mandatory_roles: [...new Set([...mandatory, 'supervisor_1'])] as ScaleupRole[],
    executive_order: order,
    merge_supervisor_executive: v.merge_supervisor_executive !== false,
    director_when_supervisor: v.director_when_supervisor !== false,
  }
}
export function planScaleupApproval(nominees: Nominees, policy: ApprovalPolicy = DEFAULT_SCALEUP_POLICY): ApprovalStage[] {
  const p = normalizePolicy(policy)
  const selected: Partial<Record<ScaleupRole, string>> = {}
  for (const role of SCALEUP_ROLE_KEYS) {
    const id = String(nominees[role as keyof Nominees] || '').trim()
    if (id) selected[role] = id
  }
  const required = new Set<ScaleupRole>([...p.mandatory_roles, 'supervisor_1'])
  if (selected.supervisor_2) required.add('supervisor_2')
  if (selected.director) required.add('director')
  if (p.director_when_supervisor && selected.director && [selected.supervisor_1, selected.supervisor_2].includes(selected.director)) required.add('director')
  for (const role of required) if (!selected[role]) throw Error(`Approver wajib ${ROLE_LABELS[role]} belum dipilih.`)
  if (selected.supervisor_1 === selected.supervisor_2 && selected.supervisor_2) throw Error('Atasan 1 dan Atasan 2 harus berbeda.')
  const executive = new Set(p.executive_order)
  // Default separation of duties: SDK and Finance are independent decisions even with the same person.
  const executiveOrder = p.executive_order.filter(role => selected[role] && (required.has(role) || role === 'director'))
  const deferred = new Map<ScaleupRole, ScaleupRole[]>()
  const normal: ApprovalStage[] = []
  for (const supervisor of ['supervisor_1', 'supervisor_2'] as ScaleupRole[]) {
    const actor = selected[supervisor]
    if (!actor) continue
    const match = p.merge_supervisor_executive
      ? executiveOrder.find(role => executive.has(role) && selected[role] === actor)
      : undefined
    if (match) {
      const previous = deferred.get(match) || []
      deferred.set(match, [...previous, supervisor])
    } else normal.push({ order: 0, approver_employee_id: actor, obligations: [supervisor], label: ROLE_LABELS[supervisor] })
  }
  for (const role of executiveOrder) {
    const actor = selected[role]
    if (!actor) continue
    const obligations = [...(deferred.get(role) || []), role]
    normal.push({ order: 0, approver_employee_id: actor, obligations, label: obligations.map(key => ROLE_LABELS[key]).join(' / ') })
  }
  const count = new Map<string, number>()
  for (const stage of normal) for (const obligation of stage.obligations) count.set(obligation, (count.get(obligation) || 0) + 1)
  for (const requiredRole of required) if (count.get(requiredRole) !== 1) throw Error(`Tahapan ${ROLE_LABELS[requiredRole]} tidak lengkap.`)
  return normal.map((stage, index) => ({ ...stage, order: index + 1 }))
}
