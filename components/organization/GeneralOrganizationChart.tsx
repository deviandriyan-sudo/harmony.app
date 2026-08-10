'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Loader2,
  RefreshCcw,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'

type OrgEmployee = {
  id: string
  employee_number?: string | null
  full_name?: string | null
  email?: string | null
  department?: string | null
  position?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
  employment_status?: string | null
  is_active?: boolean | null
}

type OrgAssignment = {
  id: string
  employee_id: string
  employee_number?: string | null
  full_name?: string | null
  assignment_department?: string | null
  assignment_position?: string | null
  assignment_type?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
  start_date?: string | null
  end_date?: string | null
  is_primary?: boolean | null
  is_active?: boolean | null
  notes?: string | null
}

type OrgPayload = {
  employees?: OrgEmployee[]
  assignments?: OrgAssignment[]
  meta?: {
    version?: string | null
    employee_count?: number | null
    assignment_count?: number | null
    generated_at?: string | null
  } | null
  generated_at?: string | null
}

type EdgeType = 'solid' | 'dashed'
type NodeKind = 'primary' | 'assignment'

type ChartNode = {
  key: string
  kind: NodeKind
  edgeType: EdgeType
  employeeId: string
  employeeNumber: string
  fullName: string
  department: string
  position: string
  assignmentType: string
  assignmentIndex: number
  children: ChartNode[]
}

type ChartModel = {
  roots: ChartNode[]
  unconnected: ChartNode[]
  employeeCount: number
  assignmentCount: number
  directorFound: boolean
}

function clean(value?: string | number | null) {
  return String(value ?? '').trim()
}

function normalize(value?: string | number | null) {
  return clean(value).toLowerCase().replace(/\s+/g, ' ')
}

function isSameText(a?: string | null, b?: string | null) {
  const left = normalize(a)
  const right = normalize(b)

  return Boolean(left && right && left === right)
}

function getPositionWeight(position: string) {
  const value = normalize(position)

  if (value === 'direktur' || (value.includes('direktur') && !value.includes('wakil'))) return 0
  if (value.includes('wakil direktur') || value.includes('wadir')) return 10
  if (value.includes('kepala program studi') || value.includes('ketua program studi')) return 20
  if (value.includes('kepala unit') || value.includes('kepala upt')) return 25
  if (value.includes('kepala') || value.includes('ketua')) return 30
  if (value.includes('koordinator') || value.includes('pic')) return 35
  if (value.includes('dosen')) return 50
  if (value.includes('instruktur')) return 55
  if (value.includes('staf') || value.includes('staff')) return 60

  return 45
}

function sortNodes(nodes: ChartNode[]) {
  return [...nodes].sort((a, b) => {
    const weightDiff = getPositionWeight(a.position) - getPositionWeight(b.position)

    if (weightDiff !== 0) return weightDiff

    const departmentDiff = a.department.localeCompare(b.department, 'id')

    if (departmentDiff !== 0) return departmentDiff

    return a.fullName.localeCompare(b.fullName, 'id')
  })
}

function isDirectorPosition(position?: string | null) {
  const value = normalize(position)

  if (!value) return false
  if (value === 'direktur') return true

  return value.includes('direktur') && !value.includes('wakil')
}

function getAssignmentTypeLabel(value: string) {
  const type = normalize(value)

  if (type === 'structural') return 'Jabatan Struktural'
  if (type === 'coordinator') return 'Koordinator / PIC'
  if (type === 'task_force') return 'Task Force'
  if (type === 'acting') return 'Plt. / Pelaksana Tugas'

  return 'Penugasan Tambahan'
}

function parsePayload(raw: unknown): OrgPayload {
  if (!raw) return {}

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as OrgPayload
    } catch {
      return {}
    }
  }

  if (typeof raw === 'object') {
    return raw as OrgPayload
  }

  return {}
}

function describeSupabaseError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error',
      code: '',
      details: '',
      hint: '',
    }
  }

  if (typeof error === 'object' && error !== null) {
    const row = error as Record<string, unknown>

    return {
      message: clean(row.message as string) || 'Unknown Supabase error',
      code: clean(row.code as string),
      details: clean(row.details as string),
      hint: clean(row.hint as string),
    }
  }

  return {
    message: clean(String(error || 'Unknown error')),
    code: '',
    details: '',
    hint: '',
  }
}

function formatSupabaseError(error: unknown) {
  const detail = describeSupabaseError(error)

  return [
    detail.message,
    detail.code ? `Code: ${detail.code}` : '',
    detail.details ? `Detail: ${detail.details}` : '',
    detail.hint ? `Hint: ${detail.hint}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

function buildChartModel(
  sourceEmployees: OrgEmployee[],
  sourceAssignments: OrgAssignment[],
  showAdditional: boolean,
): ChartModel {
  const employees = sourceEmployees
    .filter((employee) => clean(employee.id))
    .map((employee) => ({
      ...employee,
      id: clean(employee.id),
      full_name: clean(employee.full_name) || clean(employee.email) || 'Karyawan',
      employee_number: clean(employee.employee_number),
      department: clean(employee.department),
      position: clean(employee.position) || 'Jabatan belum diisi',
      supervisor_1: clean(employee.supervisor_1),
      supervisor_2: clean(employee.supervisor_2),
      email: clean(employee.email),
    }))

  const employeeById = new Map<string, (typeof employees)[number]>()
  const employeeReferenceMap = new Map<string, string>()

  employees.forEach((employee) => {
    employeeById.set(employee.id, employee)

    ;[
      employee.id,
      employee.employee_number,
      employee.full_name,
      employee.email,
    ].forEach((reference) => {
      const key = normalize(reference)

      if (key && !employeeReferenceMap.has(key)) {
        employeeReferenceMap.set(key, employee.id)
      }
    })
  })

  const resolveEmployeeId = (reference?: string | null) => {
    const key = normalize(reference)

    if (!key) return ''

    return employeeReferenceMap.get(key) || ''
  }

  const assignments = sourceAssignments
    .filter((assignment) => clean(assignment.id) && clean(assignment.employee_id))
    .filter((assignment) => employeeById.has(clean(assignment.employee_id)))
    .map((assignment) => ({
      ...assignment,
      id: clean(assignment.id),
      employee_id: clean(assignment.employee_id),
      assignment_department: clean(assignment.assignment_department),
      assignment_position: clean(assignment.assignment_position) || 'Penugasan Tambahan',
      assignment_type: clean(assignment.assignment_type) || 'additional_assignment',
      supervisor_1: clean(assignment.supervisor_1),
      supervisor_2: clean(assignment.supervisor_2),
    }))

  const assignmentsByEmployee = new Map<string, typeof assignments>()

  assignments.forEach((assignment) => {
    const list = assignmentsByEmployee.get(assignment.employee_id) || []
    list.push(assignment)
    assignmentsByEmployee.set(assignment.employee_id, list)
  })

  assignmentsByEmployee.forEach((list, employeeId) => {
    list.sort((a, b) => {
      const departmentDiff = clean(a.assignment_department).localeCompare(
        clean(b.assignment_department),
        'id',
      )

      if (departmentDiff !== 0) return departmentDiff

      return clean(a.assignment_position).localeCompare(clean(b.assignment_position), 'id')
    })

    assignmentsByEmployee.set(employeeId, list)
  })

  const nodeByKey = new Map<string, ChartNode>()
  const primaryKeyByEmployee = new Map<string, string>()
  const assignmentKeyById = new Map<string, string>()

  employees.forEach((employee) => {
    const key = `employee:${employee.id}`

    primaryKeyByEmployee.set(employee.id, key)
    nodeByKey.set(key, {
      key,
      kind: 'primary',
      edgeType: 'solid',
      employeeId: employee.id,
      employeeNumber: employee.employee_number,
      fullName: employee.full_name,
      department: employee.department,
      position: employee.position,
      assignmentType: '',
      assignmentIndex: 0,
      children: [],
    })
  })

  if (showAdditional) {
    assignments.forEach((assignment) => {
      const owner = employeeById.get(assignment.employee_id)

      if (!owner) return

      const siblings = assignmentsByEmployee.get(assignment.employee_id) || []
      const index = Math.max(0, siblings.findIndex((item) => item.id === assignment.id)) + 2
      const key = `assignment:${assignment.id}`

      assignmentKeyById.set(assignment.id, key)
      nodeByKey.set(key, {
        key,
        kind: 'assignment',
        edgeType: 'dashed',
        employeeId: owner.id,
        employeeNumber: owner.employee_number,
        fullName: owner.full_name,
        department: assignment.assignment_department || owner.department,
        position: assignment.assignment_position,
        assignmentType: assignment.assignment_type,
        assignmentIndex: index,
        children: [],
      })
    })
  }

  const parentByNode = new Map<string, string>()

  const findBestSupervisorNode = (
    supervisorEmployeeId: string,
    targetDepartment: string,
    excludedAssignmentId = '',
  ) => {
    if (!supervisorEmployeeId) return ''

    if (showAdditional && targetDepartment) {
      const supervisorAssignments = assignmentsByEmployee.get(supervisorEmployeeId) || []

      const matchingAssignment = supervisorAssignments.find(
        (assignment) =>
          assignment.id !== excludedAssignmentId &&
          isSameText(assignment.assignment_department, targetDepartment) &&
          assignmentKeyById.has(assignment.id),
      )

      if (matchingAssignment) {
        return assignmentKeyById.get(matchingAssignment.id) || ''
      }
    }

    return primaryKeyByEmployee.get(supervisorEmployeeId) || ''
  }

  employees.forEach((employee) => {
    const nodeKey = primaryKeyByEmployee.get(employee.id)

    if (!nodeKey) return

    const supervisorId =
      resolveEmployeeId(employee.supervisor_1) ||
      resolveEmployeeId(employee.supervisor_2)

    if (!supervisorId || supervisorId === employee.id) return

    const parentKey = findBestSupervisorNode(
      supervisorId,
      employee.department,
    )

    if (parentKey && parentKey !== nodeKey) {
      parentByNode.set(nodeKey, parentKey)
    }
  })

  if (showAdditional) {
    assignments.forEach((assignment) => {
      const nodeKey = assignmentKeyById.get(assignment.id)

      if (!nodeKey) return

      const supervisorId =
        resolveEmployeeId(assignment.supervisor_1) ||
        resolveEmployeeId(assignment.supervisor_2)

      let parentKey = ''

      if (supervisorId && supervisorId !== assignment.employee_id) {
        parentKey = findBestSupervisorNode(
          supervisorId,
          assignment.assignment_department,
          assignment.id,
        )
      }

      if (!parentKey) {
        parentKey = primaryKeyByEmployee.get(assignment.employee_id) || ''
      }

      if (parentKey && parentKey !== nodeKey) {
        parentByNode.set(nodeKey, parentKey)
      }
    })
  }

  parentByNode.forEach((parentKey, childKey) => {
    const parent = nodeByKey.get(parentKey)
    const child = nodeByKey.get(childKey)

    if (!parent || !child) return

    parent.children.push(child)
  })

  nodeByKey.forEach((node) => {
    node.children = sortNodes(node.children)
  })

  const directorPrimaryNodes = employees
    .filter((employee) => isDirectorPosition(employee.position))
    .map((employee) => nodeByKey.get(primaryKeyByEmployee.get(employee.id) || ''))
    .filter(Boolean) as ChartNode[]

  const topLevelNodes = [...nodeByKey.values()].filter(
    (node) => !parentByNode.has(node.key),
  )

  const roots =
    directorPrimaryNodes.length > 0
      ? sortNodes(directorPrimaryNodes)
      : sortNodes(topLevelNodes.filter((node) => node.kind === 'primary'))

  const visited = new Set<string>()

  const walk = (node: ChartNode, activePath = new Set<string>()) => {
    if (activePath.has(node.key)) return

    visited.add(node.key)

    const nextPath = new Set(activePath)
    nextPath.add(node.key)

    node.children.forEach((child) => walk(child, nextPath))
  }

  roots.forEach((root) => walk(root))

  const unconnected = sortNodes(
    [...nodeByKey.values()].filter(
      (node) =>
        node.kind === 'primary' &&
        !visited.has(node.key) &&
        !isDirectorPosition(node.position),
    ),
  )

  return {
    roots,
    unconnected,
    employeeCount: employees.length,
    assignmentCount: showAdditional ? assignments.length : 0,
    directorFound: directorPrimaryNodes.length > 0,
  }
}

export function GeneralOrganizationChart({
  compact = false,
}: {
  compact?: boolean
}) {
  const [employees, setEmployees] = useState<OrgEmployee[]>([])
  const [assignments, setAssignments] = useState<OrgAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showAdditional, setShowAdditional] = useState(true)
  const [showUnconnected, setShowUnconnected] = useState(false)

  const model = useMemo(
    () => buildChartModel(employees, assignments, showAdditional),
    [employees, assignments, showAdditional],
  )

  useEffect(() => {
    fetchOrganization()
  }, [])

  async function fetchOrganization(isRefresh = false) {
    try {
      setErrorMessage('')

      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      let nextEmployees: OrgEmployee[] = []
      let nextAssignments: OrgAssignment[] = []
      let rpcFailureMessage = ''

      const rpcResponse = await supabase.rpc('get_general_organization_chart')

      if (!rpcResponse.error) {
        const payload = parsePayload(rpcResponse.data)

        nextEmployees = Array.isArray(payload.employees)
          ? payload.employees
          : []

        nextAssignments = Array.isArray(payload.assignments)
          ? payload.assignments
          : []

        if (payload.meta?.version && payload.meta.version !== 'SO_V2') {
          console.warn(
            `SO Umum menggunakan RPC versi ${payload.meta.version}.`,
          )
        }
      } else {
        rpcFailureMessage = formatSupabaseError(rpcResponse.error)

        const employeesResponse = await supabase
          .from('employees')
          .select(
            'id, employee_number, full_name, email, department, position, supervisor_1, supervisor_2, employment_status, is_active',
          )
          .order('full_name', { ascending: true })

        if (employeesResponse.error) {
          const employeeError = formatSupabaseError(employeesResponse.error)

          throw new Error(
            [
              'SO Umum gagal dimuat melalui RPC maupun tabel employees.',
              rpcFailureMessage ? `RPC: ${rpcFailureMessage}` : '',
              employeeError ? `Employees: ${employeeError}` : '',
            ]
              .filter(Boolean)
              .join(' · '),
          )
        }

        nextEmployees = Array.isArray(employeesResponse.data)
          ? (employeesResponse.data as OrgEmployee[])
          : []

        const assignmentsResponse = await supabase
          .from('employee_assignments')
          .select('*')
          .eq('is_active', true)

        if (!assignmentsResponse.error && Array.isArray(assignmentsResponse.data)) {
          nextAssignments = assignmentsResponse.data as OrgAssignment[]
        } else {
          nextAssignments = []

          if (assignmentsResponse.error) {
            console.warn(
              'SO Umum: jabatan tambahan belum dapat dimuat.',
              formatSupabaseError(assignmentsResponse.error),
            )
          }
        }

        console.warn(
          'SO Umum menggunakan fallback tabel langsung karena RPC gagal.',
          rpcFailureMessage || 'RPC error tanpa detail.',
        )
      }

      setEmployees(nextEmployees)
      setAssignments(nextAssignments)
    } catch (error: unknown) {
      const readableError = formatSupabaseError(error)

      console.warn(
        'SO Umum belum berhasil dimuat.',
        readableError || 'Unknown error',
      )

      setEmployees([])
      setAssignments([])
      setErrorMessage(
        readableError ||
          'SO Umum belum berhasil dimuat. Periksa akses tabel employees dan employee_assignments.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/5 bg-gradient-to-br from-white via-white to-slate-50 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1 text-[11px] font-bold text-[#007aff]">
            <GitBranch size={14} />
            SO Umum
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-tight text-[#1d1d1f] sm:text-2xl">
            Struktur Organisasi Umum
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e6e73]">
            Struktur utama ditampilkan dari Direktur berdasarkan atasan dan homebase.
            Jabatan kedua atau penugasan tambahan menggunakan konektor garis putus-putus.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => setShowAdditional((value) => !value)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
          >
            <GitBranch size={15} />
            {showAdditional ? 'Sembunyikan Jabatan 2' : 'Tampilkan Jabatan 2'}
          </button>

          <button
            type="button"
            onClick={() => fetchOrganization(true)}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCcw size={15} />
            )}
            Refresh SO
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-black/5 bg-white px-5 py-3 text-[11px] font-semibold text-slate-600 sm:px-6">
        <LegendLine dashed={false} label="Struktur / jabatan utama" />
        <LegendLine dashed label="Jabatan 2 / penugasan tambahan" />

        {!loading && (
          <>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {model.employeeCount} karyawan aktif
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
              {assignments.length} jabatan tambahan aktif
            </span>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 p-8 text-sm font-semibold text-[#6e6e73]">
          <Loader2 size={20} className="animate-spin" />
          Memuat struktur organisasi...
        </div>
      ) : errorMessage ? (
        <div className="p-5 sm:p-6">
          <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">SO Umum belum dapat ditampilkan.</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        </div>
      ) : model.roots.length === 0 ? (
        <div className="p-8 text-center">
          <Building2 size={30} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">
            Data struktur belum tersedia.
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Pastikan jabatan Direktur dan data supervisor pada Master Karyawan sudah terisi.
          </p>
        </div>
      ) : (
        <>
          {!model.directorFound && (
            <div className="mx-5 mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-700 sm:mx-6">
              Jabatan “Direktur” belum ditemukan secara eksplisit. Sistem sementara menampilkan
              node tingkat paling atas dari data supervisor yang tersedia.
            </div>
          )}

          <div className="overflow-x-auto px-4 py-7 sm:px-6">
            <div className={compact ? 'min-w-max pb-2' : 'min-w-max pb-4'}>
              <div className="flex items-start justify-center gap-10">
                {model.roots.map((root) => (
                  <OrgTreeNode
                    key={root.key}
                    node={root}
                    compact={compact}
                    depth={0}
                    path={new Set<string>()}
                  />
                ))}
              </div>
            </div>
          </div>

          {model.unconnected.length > 0 && (
            <div className="border-t border-black/5 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setShowUnconnected((value) => !value)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Belum Terhubung ke Struktur
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {model.unconnected.length} karyawan belum memiliki jalur supervisor yang
                    tersambung ke Direktur.
                  </p>
                </div>

                {showUnconnected ? (
                  <ChevronUp size={18} className="text-slate-500" />
                ) : (
                  <ChevronDown size={18} className="text-slate-500" />
                )}
              </button>

              {showUnconnected && (
                <div className="grid gap-3 border-t border-black/5 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 xl:grid-cols-4">
                  {model.unconnected.map((node) => (
                    <OrgCard key={node.key} node={node} compact />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function LegendLine({
  dashed,
  label,
}: {
  dashed: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
      <span
        className={[
          'block w-7 border-t-2',
          dashed ? 'border-dashed border-violet-400' : 'border-solid border-slate-400',
        ].join(' ')}
      />
      {label}
    </span>
  )
}

function OrgTreeNode({
  node,
  compact,
  depth,
  path,
}: {
  node: ChartNode
  compact: boolean
  depth: number
  path: Set<string>
}) {
  if (path.has(node.key) || depth > 12) {
    return null
  }

  const nextPath = new Set(path)
  nextPath.add(node.key)

  const children = sortNodes(node.children)

  return (
    <div className="flex flex-col items-center">
      <OrgCard node={node} compact={compact} root={depth === 0} />

      {children.length > 0 && (
        <div className="flex flex-col items-center">
          <div
            className={[
              'h-6 border-l-2',
              children.length === 1 && children[0].edgeType === 'dashed'
                ? 'border-dashed border-violet-400'
                : 'border-slate-300',
            ].join(' ')}
          />

          <div className="flex items-start justify-center">
            {children.map((child, index) => {
              const first = index === 0
              const last = index === children.length - 1
              const only = children.length === 1

              return (
                <div
                  key={child.key}
                  className="relative flex flex-col items-center px-3 pt-6"
                >
                  {!only && (
                    <div
                      className={[
                        'absolute top-0 border-t-2 border-slate-300',
                        first
                          ? 'left-1/2 right-0'
                          : last
                            ? 'left-0 right-1/2'
                            : 'left-0 right-0',
                      ].join(' ')}
                    />
                  )}

                  <div
                    className={[
                      'absolute left-1/2 top-0 h-6 -translate-x-1/2 border-l-2',
                      child.edgeType === 'dashed'
                        ? 'border-dashed border-violet-400'
                        : 'border-slate-300',
                    ].join(' ')}
                  />

                  <OrgTreeNode
                    node={child}
                    compact={compact}
                    depth={depth + 1}
                    path={nextPath}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function OrgCard({
  node,
  compact = false,
  root = false,
}: {
  node: ChartNode
  compact?: boolean
  root?: boolean
}) {
  const isAssignment = node.kind === 'assignment'
  const widthClass = compact ? 'w-[205px]' : 'w-[230px]'

  if (root && !isAssignment) {
    return (
      <div
        className={`${widthClass} rounded-[24px] border border-slate-800 bg-[#1d1d1f] p-4 text-center text-white shadow-[0_12px_35px_rgba(15,23,42,0.16)]`}
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
          <Building2 size={18} />
        </div>

        <p className="mt-3 truncate text-sm font-extrabold">
          {node.fullName}
        </p>
        <p className="mt-1 text-xs font-bold text-[#5ac8fa]">
          {node.position}
        </p>
        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/55">
          {node.department || 'Pimpinan'}
        </p>

        {node.employeeNumber && (
          <p className="mt-2 text-[10px] font-semibold text-white/40">
            NPK {node.employeeNumber}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={[
        widthClass,
        'rounded-[22px] p-3.5 text-center shadow-sm',
        isAssignment
          ? 'border-2 border-dashed border-violet-300 bg-violet-50/90'
          : 'border border-slate-200 bg-white',
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto flex h-9 w-9 items-center justify-center rounded-2xl',
          isAssignment
            ? 'bg-violet-100 text-violet-700'
            : 'bg-[#e8f2ff] text-[#007aff]',
        ].join(' ')}
      >
        {isAssignment ? <GitBranch size={16} /> : <UserRound size={16} />}
      </div>

      {isAssignment && (
        <div className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-violet-700 shadow-sm">
          Jabatan {node.assignmentIndex}
        </div>
      )}

      <p className="mt-2 truncate text-xs font-extrabold text-[#1d1d1f]">
        {node.fullName}
      </p>

      <p
        className={[
          'mt-1 line-clamp-2 min-h-8 text-[11px] font-bold leading-4',
          isAssignment ? 'text-violet-700' : 'text-slate-700',
        ].join(' ')}
      >
        {node.position}
      </p>

      <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">
        {node.department || '-'}
      </p>

      {isAssignment && (
        <p className="mt-2 text-[9px] font-semibold text-violet-500">
          {getAssignmentTypeLabel(node.assignmentType)}
        </p>
      )}

      {node.employeeNumber && (
        <p className="mt-2 text-[9px] font-semibold text-slate-400">
          NPK {node.employeeNumber}
        </p>
      )}
    </div>
  )
}