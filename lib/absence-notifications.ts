type EmployeeLike = {
  id?: string | null
  full_name?: string | null
  name?: string | null
  employee_name?: string | null
  employee_number?: string | null
  nip?: string | null
  machine_pin?: string | null
  email?: string | null
  department?: string | null
  unit?: string | null
  work_unit?: string | null
  position?: string | null
  position_name?: string | null
  job_position?: string | null
  supervisor_1?: string | null
  supervisor_2?: string | null
}

type AbsenceNotificationPayload = {
  employees: EmployeeLike[]
  requester: EmployeeLike

  requestId?: string | null
  requestTypeLabel: string
  startDate?: string | null
  endDate?: string | null
  totalDays?: number | null

  reason?: string | null
  jobPending?: string | null
  handoverTo?: string | null
  handoverNote?: string | null

  relatedModule?: string
  relatedTable?: string
  actionPath?: string
}

type EmailTarget = {
  email: string
  name?: string | null
  roleLabel: string
}

function normalize(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function isEmail(value?: string | null) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function formatDate(value?: string | null) {
  if (!value) return '-'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getEmployeeName(employee?: EmployeeLike | null) {
  return (
    employee?.full_name ||
    employee?.employee_name ||
    employee?.name ||
    employee?.email ||
    '-'
  )
}

function getEmployeeUnit(employee?: EmployeeLike | null) {
  return employee?.department || employee?.unit || employee?.work_unit || '-'
}

function getEmployeePosition(employee?: EmployeeLike | null) {
  return employee?.position || employee?.position_name || employee?.job_position || '-'
}

function getIdentityList(employee?: EmployeeLike | null) {
  return [
    employee?.id,
    employee?.full_name,
    employee?.employee_name,
    employee?.name,
    employee?.employee_number,
    employee?.nip,
    employee?.machine_pin,
    employee?.email,
  ]
    .filter(Boolean)
    .map((item) => normalize(String(item)))
}

function findEmployeeByIdentity(
  employees: EmployeeLike[],
  identity?: string | null
) {
  const target = normalize(identity)

  if (!target) return null

  return (
    employees.find((employee) => {
      return getIdentityList(employee).includes(target)
    }) || null
  )
}

function addTarget(
  targets: EmailTarget[],
  target: EmailTarget | null
) {
  if (!target?.email) return

  const cleanEmail = normalize(target.email)

  if (!cleanEmail) return

  const alreadyExists = targets.some((item) => normalize(item.email) === cleanEmail)

  if (alreadyExists) return

  targets.push({
    ...target,
    email: cleanEmail,
  })
}

function getBaseUrl() {
  if (typeof window === 'undefined') return ''

  return window.location.origin
}

async function sendNotificationEmail({
  to,
  recipientName,
  subject,
  title,
  message,
  notificationType,
  relatedModule,
  relatedTable,
  relatedId,
  actionUrl,
  metadata,
}: {
  to: string
  recipientName?: string | null
  subject: string
  title: string
  message: string
  notificationType: string
  relatedModule?: string
  relatedTable?: string
  relatedId?: string | null
  actionUrl?: string
  metadata?: Record<string, any>
}) {
  const response = await fetch('/api/notifications/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      recipient_name: recipientName || null,
      subject,
      title,
      message,
      notification_type: notificationType,
      related_module: relatedModule,
      related_table: relatedTable,
      related_id: relatedId || null,
      action_url: actionUrl,
      metadata: {
        ...(metadata || {}),
        action_url: actionUrl,
      },
    }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    console.error('Failed sending notification email:', result)
    return {
      success: false,
      error: result?.error || 'Gagal mengirim email notifikasi.',
    }
  }

  return {
    success: true,
    error: '',
  }
}

export async function notifyAbsenceRequestSubmitted({
  employees,
  requester,

  requestId,
  requestTypeLabel,
  startDate,
  endDate,
  totalDays,

  reason,
  jobPending,
  handoverTo,
  handoverNote,

  relatedModule = 'leave',
  relatedTable = 'leave_requests',
  actionPath = '/employee/approvals/leave',
}: AbsenceNotificationPayload) {
  const targets: EmailTarget[] = []

  const supervisor1 = findEmployeeByIdentity(employees, requester.supervisor_1)
  const supervisor2 = findEmployeeByIdentity(employees, requester.supervisor_2)

  addTarget(
    targets,
    supervisor1?.email
      ? {
          email: supervisor1.email,
          name: getEmployeeName(supervisor1),
          roleLabel: 'Atasan 1',
        }
      : null
  )

  addTarget(
    targets,
    supervisor2?.email
      ? {
          email: supervisor2.email,
          name: getEmployeeName(supervisor2),
          roleLabel: 'Atasan 2',
        }
      : null
  )

  if (handoverTo) {
    if (isEmail(handoverTo)) {
      addTarget(targets, {
        email: handoverTo,
        name: handoverTo,
        roleLabel: 'Penerima Job Pending',
      })
    } else {
      const handoverEmployee = findEmployeeByIdentity(employees, handoverTo)

      addTarget(
        targets,
        handoverEmployee?.email
          ? {
              email: handoverEmployee.email,
              name: getEmployeeName(handoverEmployee),
              roleLabel: 'Penerima Job Pending',
            }
          : null
      )
    }
  }

  if (targets.length === 0) {
    return {
      success: false,
      message:
        'Tidak ada email atasan atau penerima job pending yang ditemukan.',
    }
  }

  const requesterName = getEmployeeName(requester)
  const requesterUnit = getEmployeeUnit(requester)
  const requesterPosition = getEmployeePosition(requester)

  const dateRange =
    startDate && endDate
      ? `${formatDate(startDate)} s.d. ${formatDate(endDate)}`
      : startDate
        ? formatDate(startDate)
        : '-'

  const baseUrl = getBaseUrl()
  const actionUrl = baseUrl ? `${baseUrl}${actionPath}` : actionPath

  const subject = `[HARMONY] Pengajuan Ketidakhadiran - ${requesterName}`

  const title = 'Pengajuan Ketidakhadiran Baru'

  const baseMessage = [
    `${requesterName} mengajukan ${requestTypeLabel}.`,
    ``,
    `Detail pengajuan:`,
    `Nama: ${requesterName}`,
    `Unit: ${requesterUnit}`,
    `Jabatan: ${requesterPosition}`,
    `Jenis: ${requestTypeLabel}`,
    `Tanggal: ${dateRange}`,
    `Total hari: ${totalDays || '-'}`,
    `Alasan: ${reason || '-'}`,
    `Pending job: ${jobPending || '-'}`,
    `Handover kepada: ${handoverTo || '-'}`,
    `Catatan handover: ${handoverNote || '-'}`,
    ``,
    `Silakan buka HARMONY untuk melihat detail dan melakukan tindak lanjut.`,
  ].join('\n')

  const results = await Promise.all(
    targets.map((target) => {
      const message =
        target.roleLabel === 'Penerima Job Pending'
          ? [
              `Anda menerima informasi job pending dari pengajuan ketidakhadiran ${requesterName}.`,
              ``,
              baseMessage,
            ].join('\n')
          : baseMessage

      return sendNotificationEmail({
        to: target.email,
        recipientName: target.name,
        subject,
        title,
        message,
        notificationType: 'absence_request_submitted',
        relatedModule,
        relatedTable,
        relatedId: requestId,
        actionUrl,
        metadata: {
          requester_name: requesterName,
          request_type_label: requestTypeLabel,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          target_role: target.roleLabel,
          handover_to: handoverTo,
        },
      })
    })
  )

  const failed = results.filter((item) => !item.success)

  return {
    success: failed.length === 0,
    message:
      failed.length === 0
        ? 'Email notifikasi berhasil dikirim.'
        : `${failed.length} email gagal dikirim.`,
  }
}
