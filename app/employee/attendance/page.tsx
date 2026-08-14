"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Fingerprint,
  Lock,
  LockOpen,
  PencilLine,
  RefreshCcw,
  Save,
  Send,
  Timer,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/lib/supabase";
import { sendHarmonyEmail } from "@/lib/notifications";
import {
  getActiveHarmonyTypesForScope,
  getHarmonyRequestTypeMeta,
  getHarmonyRequestTypesCache,
  groupHarmonyTypes,
  refreshHarmonyRequestTypes,
  type HarmonyRequestTypeDefinition,
} from "@/lib/harmony-request-types";

type AppUser = {
  id: string;
  email: string;
  role: string;
  employee_id: string | null;
  is_active: boolean | null;
};

type EmployeeProfile = {
  id: string;
  employee_number: string | null;
  machine_pin: string | null;
  full_name: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  supervisor_1: string | null;
  supervisor_2: string | null;
  is_active: boolean | null;
  join_date?: string | null;
};

type EmployeeAssignment = {
  id: string;
  employee_id: string;
  supervisor_1: string | null;
  supervisor_2: string | null;
  is_active: boolean | null;
};

type AttendanceLog = {
  id: string;
  upload_id: string | null;
  employee_id: string | null;
  employee_number: string | null;
  machine_pin: string | null;
  full_name: string | null;
  department: string | null;
  position: string | null;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  total_punches: number | null;
  status: string | null;
  source: string | null;
  notes: string | null;
  work_duration_minutes: number | null;

  correction_status: string | null;
  correction_type: string | null;
  correction_reason: string | null;
  correction_proof_url: string | null;
  correction_proof_name: string | null;
  correction_submitted_by: string | null;
  correction_submitted_role: string | null;
  correction_submitted_at: string | null;
  requested_check_in: string | null;
  requested_check_out: string | null;

  supervisor_approval_status: string | null;
  supervisor_approved_by: string | null;
  supervisor_approved_at: string | null;
  hr_approval_status: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  correction_notes: string | null;

  employee_confirmation_status: string | null;
  employee_confirmed_at: string | null;
  employee_confirmation_batch_id: string | null;

  supervisor_reviewed_at: string | null;
  supervisor_reviewed_by: string | null;

  hr_final_status: string | null;
  hr_finalized_at: string | null;
  hr_finalized_by: string | null;

  is_phl_candidate: boolean | null;
  phl_proof_url: string | null;
  phl_proof_name: string | null;
  absence_proof_url: string | null;
  absence_proof_name: string | null;

  manual_check_in: string | null;
  manual_check_out: string | null;
  employee_daily_note: string | null;
  supervisor_note: string | null;
  hr_note: string | null;

  absence_request_type: string | null;
  absence_request_label: string | null;
  absence_request_status: string | null;
  absence_request_source: string | null;

  is_locked?: boolean | null;
  locked_at?: string | null;
  locked_by?: string | null;
  locked_by_name?: string | null;
  unlocked_at?: string | null;
  unlocked_by?: string | null;
  unlocked_by_name?: string | null;
  lock_note?: string | null;

  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

type Holiday = {
  id: string;
  holiday_date: string;
  holiday_name: string;
  holiday_type: string | null;
  is_active: boolean | null;
};

type CalendarDayRow = {
  date: string;
  day_name: string;
  is_weekend: boolean;
  holiday_name: string | null;
  holiday_type: string | null;
  log: AttendanceLog | null;
  status: string;
};

type AttendancePeriodConfirmation = {
  id: string;
  employee_id: string;
  period_month: string;
  period_start: string;
  period_end: string;

  employee_status: string | null;
  supervisor_status: string | null;
  hr_status: string | null;

  employee_submitted_at: string | null;
  employee_submitted_by?: string | null;

  supervisor_approved_at: string | null;
  supervisor_rejected_at: string | null;
  supervisor_name?: string | null;
  supervisor_note?: string | null;

  hr_finalized_at: string | null;
  hr_finalized_by?: string | null;
  hr_note?: string | null;

  is_locked?: boolean | null;
  locked_by?: string | null;
  locked_by_name?: string | null;
  locked_at?: string | null;
  unlocked_by?: string | null;
  unlocked_by_name?: string | null;
  unlocked_at?: string | null;
  lock_note?: string | null;
};

type DailyType = string;

type RowDraft = {
  daily_type: DailyType;
  manual_check_in: string;
  manual_check_out: string;
  employee_daily_note: string;
  absence_file: File | null;
  phl_file: File | null;
};

type DailyTypeMeta = {
  label: string;
  status: string;
  correctionType: string;
  absenceRequestType: string | null;
  absenceRequestLabel: string | null;
  requiresProof: boolean;
  requiresManualTime: boolean;
  isLeaveLike: boolean;
  isAbsenceLike: boolean;
  isPHLClaim: boolean;
};

type LiveManualForm = {
  attendance_date: string;
  manual_check_in: string;
  manual_check_out: string;
  reason: string;
  proof_file: File | null;
  existing_proof_url: string;
  existing_proof_name: string;
};

type PeriodTotals = {
  totalWorkDays: number;
  present: number;
  late: number;
  incomplete: number;
  absent: number;
  sick: number;
  permit: number;
  leave: number;
  phl: number;
  phlClaim: number;
  officialTravel: number;
  holidayWork: number;
};

const emptyRowDraft: RowDraft = {
  daily_type: "present",
  manual_check_in: "",
  manual_check_out: "",
  employee_daily_note: "",
  absence_file: null,
  phl_file: null,
};

function createLiveManualForm(date = getTodayISO()): LiveManualForm {
  return {
    attendance_date: date,
    manual_check_in: "",
    manual_check_out: "",
    reason: "",
    proof_file: null,
    existing_proof_url: "",
    existing_proof_name: "",
  };
}

export default function EmployeeAttendancePage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [periodConfirmation, setPeriodConfirmation] =
    useState<AttendancePeriodConfirmation | null>(null);
  const [requestTypes, setRequestTypes] = useState<HarmonyRequestTypeDefinition[]>(
    () => getHarmonyRequestTypesCache(),
  );

  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth());
  const [loading, setLoading] = useState(true);
  const [submittingPeriod, setSubmittingPeriod] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CalendarDayRow | null>(null);
  const [resettingDate, setResettingDate] = useState<string>("");
  const [savingInlineManualDate, setSavingInlineManualDate] =
    useState<string>("");

  // Absensi manual harian yang dapat digunakan kapan saja,
  // tidak bergantung pada periode yang sedang dipilih di tabel.
  const [liveManualOpen, setLiveManualOpen] = useState(false);
  const [liveManualLoading, setLiveManualLoading] = useState(false);
  const [liveManualSaving, setLiveManualSaving] = useState(false);
  const [liveManualRecord, setLiveManualRecord] =
    useState<AttendanceLog | null>(null);
  const [liveManualForm, setLiveManualForm] = useState<LiveManualForm>(() =>
    createLiveManualForm(),
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const periodRange = useMemo(() => getCutoffRange(periodMonth), [periodMonth]);

  const lockedLog = logs.find((item) => Boolean(item.is_locked)) || null;
  const unlockedLog =
    logs.find((item) => Boolean(item.unlocked_at || item.unlocked_by)) || null;

  const isFinalizedByHR =
    periodConfirmation?.hr_status === "finalized" ||
    logs.some((item) => item.hr_final_status === "finalized");

  const periodLockInfo = {
    isLocked: Boolean(
      periodConfirmation?.is_locked ||
        lockedLog?.is_locked ||
        isFinalizedByHR,
    ),
    lockedBy:
      periodConfirmation?.locked_by_name ||
      periodConfirmation?.locked_by ||
      lockedLog?.locked_by_name ||
      lockedLog?.locked_by ||
      "-",
    lockedAt: periodConfirmation?.locked_at || lockedLog?.locked_at || "",
    unlockedBy:
      periodConfirmation?.unlocked_by_name ||
      periodConfirmation?.unlocked_by ||
      unlockedLog?.unlocked_by_name ||
      unlockedLog?.unlocked_by ||
      "-",
    unlockedAt:
      periodConfirmation?.unlocked_at || unlockedLog?.unlocked_at || "",
    note:
      periodConfirmation?.lock_note ||
      lockedLog?.lock_note ||
      unlockedLog?.lock_note ||
      "-",
  };

  const isPeriodLocked = periodLockInfo.isLocked;

  // Fallback penting untuk data lama:
  // beberapa reject harian terdahulu hanya mengubah attendance_logs dan belum
  // mengubah header attendance_period_confirmations. Jika SATU saja tanggal
  // sudah ditolak atasan, seluruh periode harus dibuka kembali untuk revisi.
  const rejectedDailyLog =
    logs.find(
      (item) =>
        item.supervisor_approval_status === "rejected" ||
        item.hr_final_status === "rejected_by_supervisor",
    ) || null;

  const isSupervisorRejected =
    periodConfirmation?.supervisor_status === "rejected" ||
    periodConfirmation?.hr_status === "rejected_by_supervisor" ||
    Boolean(rejectedDailyLog);

  // Reject atasan harus mengembalikan periode ke employee untuk revisi.
  // employee_status boleh tetap "submitted" untuk histori, tetapi selama status
  // supervisor rejected ATAU ada reject harian, halaman tidak boleh read-only.
  const submittedPeriod =
    !isSupervisorRejected &&
    (periodConfirmation?.employee_status === "submitted" ||
      periodConfirmation?.supervisor_status === "pending" ||
      periodConfirmation?.supervisor_status === "approved" ||
      periodConfirmation?.hr_status === "ready_for_hr" ||
      periodConfirmation?.hr_status === "finalized");

  const isProcessReadOnly = submittedPeriod && !isPeriodLocked;
  const isReadOnlyPeriod = submittedPeriod || isPeriodLocked;
  const isPeriodComplete = getTodayISO() >= periodRange.end;

  const calendarRows = useMemo(() => {
    const dates = getDateRange(periodRange.start, periodRange.end);

    return dates.map((date) => {
      const log = logs.find((item) => item.attendance_date === date) || null;
      const holiday =
        holidays.find((item) => item.holiday_date === date) || null;
      const isWeekend = isWeekendDate(date);

      return {
        date,
        day_name: formatDayName(date),
        is_weekend: isWeekend,
        holiday_name: holiday?.holiday_name || null,
        holiday_type: holiday?.holiday_type || null,
        log,
        status: getDayStatus(log, isWeekend, Boolean(holiday)),
      };
    });
  }, [logs, holidays, periodRange.start, periodRange.end]);

  const selectableRows = useMemo(() => {
    return calendarRows;
  }, [calendarRows]);

  const selectedRows = useMemo(() => {
    return selectableRows.filter((row) => selectedDates.includes(row.date));
  }, [selectableRows, selectedDates]);

  const allRowsSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedDates.includes(row.date));

  const latestLog = logs[logs.length - 1] || null;

  // Satu tanggal hanya boleh masuk SATU kartu ringkasan.
  // Ini mencegah manual attendance terhitung sebagai Hadir + Incomplete
  // atau Hadir + Tanpa Data secara bersamaan.
  const summaryBuckets = useMemo(() => {
    return calendarRows.map((row) =>
      classifyAttendanceSummary(row, getDraft(row)),
    );
  }, [calendarRows, rowDrafts]);

  const presentCount = summaryBuckets.filter(
    (bucket) => bucket === "present",
  ).length;

  const incompleteCount = summaryBuckets.filter(
    (bucket) => bucket === "incomplete",
  ).length;

  const noRecordCount = summaryBuckets.filter(
    (bucket) => bucket === "no_record",
  ).length;

  const phlCandidateCount = summaryBuckets.filter(
    (bucket) => bucket === "phl",
  ).length;

  useEffect(() => {
    fetchData();
  }, [periodMonth]);

  async function fetchData(resetMessage = true) {
    setLoading(true);

    if (resetMessage) {
      setErrorMessage("");
      setSuccessMessage("");
    }

    setSelectedDates([]);
    setRowDrafts({});

    // Semua dropdown kehadiran/ketidakhadiran memakai master yang sama.
    // Fallback bawaan tetap tersedia bila endpoint master sedang gagal.
    const refreshedRequestTypes = await refreshHarmonyRequestTypes();
    setRequestTypes(refreshedRequestTypes);

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      setErrorMessage(
        "Session user belum ditemukan. Silakan login terlebih dahulu.",
      );
      setLoading(false);
      return;
    }

    const { data: appUserData, error: appUserError } = await supabase
      .from("app_users")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle<AppUser>();

    if (appUserError) {
      setErrorMessage(appUserError.message);
      setLoading(false);
      return;
    }

    if (!appUserData) {
      setErrorMessage("Akun belum terhubung ke app_users. Silakan hubungi HR.");
      setLoading(false);
      return;
    }

    setAppUser(appUserData);

    if (!appUserData.employee_id) {
      setErrorMessage(
        "Akun belum terhubung ke data employee. Silakan hubungi HR.",
      );
      setLoading(false);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", appUserData.employee_id)
      .maybeSingle<EmployeeProfile>();

    if (employeeError) {
      setErrorMessage(employeeError.message);
      setLoading(false);
      return;
    }

    if (!employeeData) {
      setErrorMessage("Data employee tidak ditemukan.");
      setLoading(false);
      return;
    }

    setEmployee(employeeData);

    const { data: holidayData, error: holidayError } = await supabase
      .from("holidays")
      .select("*")
      .eq("is_active", true)
      .gte("holiday_date", periodRange.start)
      .lte("holiday_date", periodRange.end)
      .order("holiday_date", { ascending: true });

    if (holidayError) {
      setErrorMessage(holidayError.message);
      setHolidays([]);
    } else {
      setHolidays(holidayData || []);
    }

    if (!employeeData.machine_pin) {
      setLogs([]);
      setErrorMessage(
        "Machine PIN belum tersedia pada data employee. Silakan hubungi HR.",
      );
      setLoading(false);
      return;
    }

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_logs")
      .select("*")
      .is("deleted_at", null)
      .eq("machine_pin", employeeData.machine_pin)
      .gte("attendance_date", periodRange.start)
      .lte("attendance_date", periodRange.end)
      .order("attendance_date", { ascending: true });

    if (attendanceError) {
      setErrorMessage(attendanceError.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs(attendanceData || []);

    const { data: confirmationData } = await supabase
      .from("attendance_period_confirmations")
      .select("*")
      .eq("employee_id", employeeData.id)
      .eq("period_month", periodMonth)
      .maybeSingle<AttendancePeriodConfirmation>();

    setPeriodConfirmation(confirmationData || null);

    setLoading(false);
  }

  function ensureDraft(row: CalendarDayRow) {
    const key = row.date;
    const existing = rowDrafts[key];

    if (existing) return existing;

    const draft: RowDraft = {
      daily_type: inferDailyType(row),
      manual_check_in:
        row.log?.manual_check_in || row.log?.requested_check_in || "",
      manual_check_out:
        row.log?.manual_check_out || row.log?.requested_check_out || "",
      employee_daily_note:
        row.log?.employee_daily_note || row.log?.correction_reason || "",
      absence_file: null,
      phl_file: null,
    };

    setRowDrafts((prev) => ({
      ...prev,
      [key]: draft,
    }));

    return draft;
  }

  function getDraft(row: CalendarDayRow | null | undefined) {
    if (!row) return emptyRowDraft;

    return (
      rowDrafts[row.date] || {
        daily_type: inferDailyType(row),
        manual_check_in:
          row.log?.manual_check_in || row.log?.requested_check_in || "",
        manual_check_out:
          row.log?.manual_check_out || row.log?.requested_check_out || "",
        employee_daily_note:
          row.log?.employee_daily_note || row.log?.correction_reason || "",
        absence_file: null,
        phl_file: null,
      }
    );
  }

  function openEdit(row: CalendarDayRow) {
    if (isPeriodLocked) {
      setErrorMessage(
        "Periode ini sudah dikunci HR. Hubungi HR jika perlu revisi.",
      );
      return;
    }

    if (submittedPeriod) {
      setErrorMessage(
        "Periode ini sudah disubmit. Tunggu approval atau hubungi HR jika perlu revisi.",
      );
      return;
    }

    ensureDraft(row);
    setSelectedRow(row);
    setEditOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeEdit() {
    setEditOpen(false);
    setSelectedRow(null);
  }

  function updateRowDraft(
    date: string,
    field: keyof RowDraft,
    value: string | File | null,
  ) {
    setRowDrafts((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] || emptyRowDraft),
        [field]: value,
      },
    }));
  }

  function toggleAttendanceSelection(row: CalendarDayRow) {
    if (isReadOnlyPeriod) return;

    setSelectedDates((prev) => {
      if (prev.includes(row.date)) {
        return prev.filter((date) => date !== row.date);
      }

      ensureDraft(row);

      return [...prev, row.date];
    });
  }

  function toggleSelectAllAttendance() {
    if (isReadOnlyPeriod) return;

    if (allRowsSelected) {
      setSelectedDates([]);
      return;
    }

    selectableRows.forEach((row) => ensureDraft(row));
    setSelectedDates(selectableRows.map((row) => row.date));
  }

  function hasLocalResettableVerification(row: CalendarDayRow) {
    const draft = rowDrafts[row.date];

    if (!draft) return false;

    return Boolean(
      draft.manual_check_in ||
        draft.manual_check_out ||
        draft.employee_daily_note ||
        draft.absence_file ||
        draft.phl_file ||
        draft.daily_type !== inferDailyType(row) ||
        selectedDates.includes(row.date),
    );
  }

  function hasDatabaseEmployeeVerification(row: CalendarDayRow) {
    const log = row.log;

    if (!log) return false;

    return Boolean(
      log.manual_check_in ||
        log.manual_check_out ||
        log.requested_check_in ||
        log.requested_check_out ||
        log.employee_daily_note ||
        log.employee_confirmation_status ||
        log.employee_confirmation_batch_id ||
        log.phl_proof_url ||
        log.phl_proof_name ||
        log.absence_proof_url ||
        log.absence_proof_name ||
        log.absence_request_type ||
        log.absence_request_label ||
        log.absence_request_status ||
        log.absence_request_source === "employee_attendance_confirmation" ||
        log.correction_submitted_role === "employee" ||
        log.correction_status === "pending" ||
        log.correction_type === "manual_check" ||
        log.source === "employee_manual_confirmation" ||
        log.source === "employee_correction",
    );
  }

  function hasResettableVerification(row: CalendarDayRow) {
    return (
      hasLocalResettableVerification(row) ||
      hasDatabaseEmployeeVerification(row)
    );
  }

  function canShowResetButton(row: CalendarDayRow) {
    // Tombol selalu dirender. Fungsi ini menentukan apakah tombol aktif.
    // Row dengan draft/selection/log dapat direset secara aman; API tetap
    // memutuskan apakah database perlu dihapus atau hanya draft lokal.
    return Boolean(
      rowDrafts[row.date] ||
        selectedDates.includes(row.date) ||
        row.log?.id,
    );
  }

  function clearLocalVerification(date: string) {
    setRowDrafts((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });

    setSelectedDates((prev) => prev.filter((item) => item !== date));

    if (selectedRow?.date === date) {
      closeEdit();
    }
  }

  async function handleResetVerification(row: CalendarDayRow) {
    setErrorMessage("");
    setSuccessMessage("");

    if (!employee || !appUser) {
      setErrorMessage("Data user atau employee belum tersedia.");
      return;
    }

    if (isPeriodLocked) {
      setErrorMessage(
        "Periode ini sudah dikunci HR. Verifikasi tidak dapat direset.",
      );
      return;
    }

    if (submittedPeriod) {
      setErrorMessage(
        "Periode ini sudah disubmit. Reset hanya dapat dilakukan sebelum Submit Periode ke Atasan.",
      );
      return;
    }

    const hasLocalData = hasLocalResettableVerification(row);
    const hasDatabaseData = hasDatabaseEmployeeVerification(row);

    if (!hasLocalData && !hasDatabaseData) {
      setSuccessMessage(
        `${formatDisplayDate(row.date)} belum memiliki data manual/verifikasi yang perlu direset.`,
      );
      return;
    }

    const confirmed = window.confirm(
      [
        `Reset verifikasi tanggal ${formatDisplayDate(row.date)}?`,
        "",
        "Data manual, keterangan, bukti PHL/ketidakhadiran, dan status verifikasi employee pada tanggal ini akan dibersihkan.",
        "Data fingerprint/scan asli dari mesin TIDAK akan dihapus.",
        "",
        "Setelah reset, tanggal ini dapat diisi ulang melalui tombol Lengkapi.",
      ].join("\n"),
    );

    if (!confirmed) return;

    setResettingDate(row.date);

    try {
      // Jika perubahan masih draft lokal atau row database hanya berisi
      // fingerprint/system data tanpa verifikasi employee, jangan sentuh DB.
      if (!hasDatabaseData) {
        clearLocalVerification(row.date);
        setSuccessMessage(
          `Draft/verifikasi ${formatDisplayDate(row.date)} berhasil direset. Data dapat diisi ulang.`,
        );
        return;
      }

      const attendanceLogId = row.log?.id;

      if (!attendanceLogId) {
        clearLocalVerification(row.date);
        setSuccessMessage(
          `Draft/verifikasi ${formatDisplayDate(row.date)} berhasil direset. Data dapat diisi ulang.`,
        );
        return;
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Session login tidak valid. Silakan login ulang.");
      }

      const response = await fetch(
        "/api/employee/attendance/reset-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            employee_id: employee.id,
            attendance_log_id: attendanceLogId,
            attendance_date: row.date,
            period_month: periodMonth,
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Reset verifikasi absensi gagal diproses.",
        );
      }

      clearLocalVerification(row.date);

      setSuccessMessage(
        result?.mode === "deleted"
          ? `Data manual ${formatDisplayDate(row.date)} berhasil dihapus dari database. Tanggal tersebut dapat diisi ulang.`
          : `Verifikasi manual ${formatDisplayDate(row.date)} berhasil direset. Data fingerprint asli tetap dipertahankan.`,
      );

      await fetchData(false);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          "Terjadi kesalahan saat mereset verifikasi absensi.",
      );
    } finally {
      setResettingDate("");
    }
  }

  async function uploadFile(file: File | null, folder: string) {
    if (!file) {
      return {
        url: "",
        name: "",
        error: "",
      };
    }

    const cleanFileName = file.name
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "");

    const fileName = `${Date.now()}-${crypto.randomUUID()}-${cleanFileName || "file"}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from("leave-attachments")
      .upload(filePath, file);

    if (error) {
      return {
        url: "",
        name: "",
        error: error.message,
      };
    }

    const { data } = supabase.storage
      .from("leave-attachments")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      name: file.name,
      error: "",
    };
  }

  async function loadLiveManualAttendance(date: string) {
    if (!employee?.id || !date) return;

    setLiveManualLoading(true);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Session login tidak valid. Silakan login ulang.");
      }

      const query = new URLSearchParams({
        employee_id: employee.id,
        attendance_date: date,
      });

      const response = await fetch(
        `/api/employee/attendance/manual-entry?${query.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          cache: "no-store",
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Data absensi manual harian gagal dimuat.",
        );
      }

      const record = (result?.record || null) as AttendanceLog | null;
      const existingProofUrl =
        record?.absence_proof_url || record?.correction_proof_url || "";
      const existingProofName =
        record?.absence_proof_name || record?.correction_proof_name || "";

      setLiveManualRecord(record);
      setLiveManualForm({
        attendance_date: date,
        manual_check_in:
          record?.manual_check_in || record?.requested_check_in || "",
        manual_check_out:
          record?.manual_check_out || record?.requested_check_out || "",
        reason:
          record?.employee_daily_note || record?.correction_reason || "",
        proof_file: null,
        existing_proof_url: existingProofUrl,
        existing_proof_name: existingProofName,
      });
    } catch (error: any) {
      setLiveManualRecord(null);
      setLiveManualForm(createLiveManualForm(date));
      setErrorMessage(
        error?.message || "Data absensi manual harian gagal dimuat.",
      );
    } finally {
      setLiveManualLoading(false);
    }
  }

  async function openLiveManualAttendance() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!employee || !appUser) {
      setErrorMessage("Data employee belum siap. Silakan refresh halaman.");
      return;
    }

    if (!employee.machine_pin) {
      setErrorMessage(
        "Machine PIN belum tersedia. Hubungi HR sebelum memakai absensi manual.",
      );
      return;
    }

    const today = getTodayISO();
    setLiveManualOpen(true);
    setLiveManualForm(createLiveManualForm(today));
    await loadLiveManualAttendance(today);
  }

  function closeLiveManualAttendance() {
    if (liveManualSaving) return;

    setLiveManualOpen(false);
    setLiveManualRecord(null);
    setLiveManualForm(createLiveManualForm());
  }

  async function handleLiveManualDateChange(date: string) {
    if (!date) return;

    if (date > getTodayISO()) {
      setErrorMessage("Absensi manual tidak dapat diisi untuk tanggal yang akan datang.");
      return;
    }

    setErrorMessage("");
    setLiveManualForm(createLiveManualForm(date));
    await loadLiveManualAttendance(date);
  }

  function updateLiveManualForm<K extends keyof LiveManualForm>(
    field: K,
    value: LiveManualForm[K],
  ) {
    setLiveManualForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function saveLiveManualAttendance() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!employee || !appUser) {
      setErrorMessage("Data employee atau akun belum tersedia.");
      return;
    }

    if (!employee.machine_pin) {
      setErrorMessage("Machine PIN belum tersedia pada data employee.");
      return;
    }

    if (!liveManualForm.attendance_date) {
      setErrorMessage("Tanggal absensi wajib dipilih.");
      return;
    }

    if (liveManualForm.attendance_date > getTodayISO()) {
      setErrorMessage("Tanggal absensi tidak boleh melebihi hari ini.");
      return;
    }

    if (
      !liveManualForm.manual_check_in &&
      !liveManualForm.manual_check_out
    ) {
      setErrorMessage(
        "Isi minimal jam masuk atau jam pulang manual terlebih dahulu.",
      );
      return;
    }

    if (liveManualForm.reason.trim().length < 5) {
      setErrorMessage(
        "Keterangan/alasan absensi manual wajib diisi minimal 5 karakter.",
      );
      return;
    }

    if (
      !liveManualForm.proof_file &&
      !liveManualForm.existing_proof_url
    ) {
      setErrorMessage(
        "Upload bukti tugas luar/perintah atasan/dokumen pendukung sebelum menyimpan absensi manual.",
      );
      return;
    }

    setLiveManualSaving(true);

    try {
      let proofUrl = liveManualForm.existing_proof_url;
      let proofName = liveManualForm.existing_proof_name;

      if (liveManualForm.proof_file) {
        const upload = await uploadFile(
          liveManualForm.proof_file,
          `attendance-live-manual/${employee.id}/${liveManualForm.attendance_date}`,
        );

        if (upload.error) {
          throw new Error(upload.error);
        }

        proofUrl = upload.url;
        proofName = upload.name;
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Session login tidak valid. Silakan login ulang.");
      }

      const response = await fetch(
        "/api/employee/attendance/manual-entry",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            employee_id: employee.id,
            attendance_date: liveManualForm.attendance_date,
            manual_check_in: liveManualForm.manual_check_in || null,
            manual_check_out: liveManualForm.manual_check_out || null,
            reason: liveManualForm.reason.trim(),
            proof_url: proofUrl,
            proof_name: proofName,
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Absensi manual gagal disimpan.",
        );
      }

      const savedDate = liveManualForm.attendance_date;
      const savedPeriod =
        result?.period_month || getPeriodMonthForDate(savedDate);

      setLiveManualOpen(false);
      setLiveManualRecord(null);
      setLiveManualForm(createLiveManualForm());

      setSuccessMessage(
        [
          `Absensi manual ${formatDisplayDate(savedDate)} berhasil disimpan langsung ke database.`,
          `Data tercatat untuk periode ${getPeriodLabel(savedPeriod)}.`,
          "Bukti tetap disimpan dan akan dipertahankan saat HR meng-upload fingerprint periode tersebut.",
          "Approval tetap mengikuti Submit Periode ke Atasan agar flow lama tidak berubah.",
        ].join(" "),
      );

      if (savedPeriod === periodMonth) {
        await fetchData(false);
      }
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Terjadi kesalahan saat menyimpan absensi manual.",
      );
    } finally {
      setLiveManualSaving(false);
    }
  }

  async function saveInlineManualVerification(row: CalendarDayRow) {
    setErrorMessage("");
    setSuccessMessage("");

    if (!employee || !appUser) {
      setErrorMessage("Data employee atau akun belum tersedia.");
      return;
    }

    if (isPeriodLocked || submittedPeriod) {
      setErrorMessage(
        "Periode ini sudah masuk proses approval atau sudah dikunci. Data manual tidak dapat diubah.",
      );
      return;
    }

    const draft = getDraft(row);
    const shouldPersistManual =
      draft.daily_type === "manual_attendance" ||
      Boolean(draft.manual_check_in || draft.manual_check_out);

    // Jenis selain manual tetap memakai flow lama:
    // disimpan sebagai draft UI lalu ikut Submit Periode.
    if (!shouldPersistManual) {
      closeEdit();
      setSuccessMessage(
        `${formatDisplayDate(row.date)} tersimpan sebagai draft verifikasi. Data akan masuk database saat Submit Periode ke Atasan.`,
      );
      return;
    }

    const effectiveIn = getEffectiveCheckIn(row, draft);
    const effectiveOut = getEffectiveCheckOut(row, draft);

    if (!effectiveIn && !effectiveOut) {
      setErrorMessage(
        `${formatDisplayDate(row.date)}: isi minimal jam masuk atau jam pulang manual.`,
      );
      return;
    }

    if (!draft.employee_daily_note.trim()) {
      setErrorMessage(
        `${formatDisplayDate(row.date)}: catatan/alasan wajib diisi untuk absensi manual.`,
      );
      return;
    }

    const existingProofUrl =
      row.log?.absence_proof_url || row.log?.correction_proof_url || "";
    const existingProofName =
      row.log?.absence_proof_name || row.log?.correction_proof_name || "";

    if (!draft.absence_file && !existingProofUrl) {
      setErrorMessage(
        `${formatDisplayDate(row.date)}: upload bukti pendukung untuk absensi manual.`,
      );
      return;
    }

    setSavingInlineManualDate(row.date);

    try {
      let proofUrl = existingProofUrl;
      let proofName = existingProofName;

      if (draft.absence_file) {
        const upload = await uploadFile(
          draft.absence_file,
          `attendance-live-manual/${employee.id}/${row.date}`,
        );

        if (upload.error) {
          throw new Error(upload.error);
        }

        proofUrl = upload.url;
        proofName = upload.name;
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.access_token) {
        throw new Error("Session login tidak valid. Silakan login ulang.");
      }

      const response = await fetch(
        "/api/employee/attendance/manual-entry",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            employee_id: employee.id,
            attendance_date: row.date,
            manual_check_in: draft.manual_check_in || null,
            manual_check_out: draft.manual_check_out || null,
            reason: draft.employee_daily_note.trim(),
            proof_url: proofUrl,
            proof_name: proofName,
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.error ||
            result?.message ||
            "Absensi manual gagal disimpan ke database.",
        );
      }

      closeEdit();

      setSuccessMessage(
        [
          `Absensi manual ${formatDisplayDate(row.date)} berhasil disimpan ke database.`,
          result?.summary_status === "present"
            ? "Ringkasan kehadiran sekarang dihitung sebagai Hadir."
            : result?.summary_status === "incomplete"
              ? "Ringkasan sekarang dihitung sebagai Incomplete sampai jam masuk/pulang lengkap."
              : "",
          "Data akan tetap mengikuti Submit Periode ke Atasan untuk proses approval.",
        ]
          .filter(Boolean)
          .join(" "),
      );

      await fetchData(false);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          "Terjadi kesalahan saat menyimpan absensi manual.",
      );
    } finally {
      setSavingInlineManualDate("");
    }
  }

  async function handleSubmitPeriod() {
    setSubmittingPeriod(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!appUser || !employee) {
      setErrorMessage("Data user atau employee belum tersedia.");
      setSubmittingPeriod(false);
      return;
    }

    if (isPeriodLocked) {
      setErrorMessage(
        "Periode ini sudah dikunci HR. Employee tidak bisa submit atau revisi data sampai HR membuka lock.",
      );
      setSubmittingPeriod(false);
      return;
    }

    if (submittedPeriod) {
      setErrorMessage(
        "Periode ini sudah pernah dikirim. Tunggu approval atasan atau HR.",
      );
      setSubmittingPeriod(false);
      return;
    }

    if (!isPeriodComplete) {
      setErrorMessage(
        `Periode ${formatDisplayDate(periodRange.start)} s.d. ${formatDisplayDate(periodRange.end)} belum selesai. Submit periode penuh baru dapat dilakukan pada/ setelah ${formatDisplayDate(periodRange.end)}.`,
      );
      setSubmittingPeriod(false);
      return;
    }

    // Tombol centang hanya checklist review employee. Saat Submit Periode ditekan,
    // SELURUH tanggal relevan dalam periode dikirim ke atasan agar tidak pernah
    // terjadi kasus hanya 1 tanggal yang terkirim tetapi header periode sudah submitted.
    const rowsToSubmit = calendarRows.filter((row) => {
      if (employee.join_date && row.date < employee.join_date) return false;

      const draft = getDraft(row);

      // Sabtu/Minggu/libur tanpa aktivitas tidak perlu dibuat menjadi attendance_log.
      // Namun jika ada fingerprint/manual/keterangan, tanggal tetap ikut dikirim.
      return !isOffDayWithoutAttendance(row, draft);
    });

    if (rowsToSubmit.length === 0) {
      setErrorMessage("Tidak ada data periode yang dapat dikirim ke atasan.");
      setSubmittingPeriod(false);
      return;
    }

    const validationErrors = rowsToSubmit
      .map((row) => validateRowBeforeSubmit(row))
      .filter(Boolean);

    if (validationErrors.length > 0) {
      setErrorMessage(
        `Submit seluruh periode belum dapat dilakukan. Lengkapi data berikut terlebih dahulu: ${validationErrors.join(" ")}`,
      );
      setSubmittingPeriod(false);
      return;
    }

    const confirmed = window.confirm(
      [
        isSupervisorRejected
          ? "Kirim ulang seluruh periode setelah revisi?"
          : "Submit seluruh periode ke atasan?",
        "",
        `Periode: ${formatDisplayDate(periodRange.start)} s.d. ${formatDisplayDate(periodRange.end)}`,
        `Tanggal yang dikirim: ${rowsToSubmit.length} hari relevan.`,
        "",
        "Centang harian hanya berfungsi sebagai checklist pengecekan. Walaupun hanya 1 tanggal yang dicentang, tombol Submit Periode akan mengirim SELURUH data periode yang relevan.",
        "",
        "Pastikan seluruh jam, keterangan, cuti/izin/sakit, PHL, tugas luar, dan bukti sudah benar.",
      ].join("\n"),
    );

    if (!confirmed) {
      setSubmittingPeriod(false);
      return;
    }

    const batchId = crypto.randomUUID();
    const confirmationId = periodConfirmation?.id || batchId;
    const now = new Date().toISOString();

    for (const row of rowsToSubmit) {
      const draft = getDraft(row);
      const meta = getDailyTypeMeta(draft.daily_type);
      const hasExistingLog = Boolean(row.log?.id);

      let absenceProofUrl = row.log?.absence_proof_url || "";
      let absenceProofName = row.log?.absence_proof_name || "";
      let phlProofUrl = row.log?.phl_proof_url || "";
      let phlProofName = row.log?.phl_proof_name || "";

      if (draft.absence_file) {
        const upload = await uploadFile(
          draft.absence_file,
          "attendance-absence-proofs",
        );

        if (upload.error) {
          setErrorMessage(upload.error);
          setSubmittingPeriod(false);
          return;
        }

        absenceProofUrl = upload.url;
        absenceProofName = upload.name;
      }

      if (draft.phl_file) {
        const upload = await uploadFile(
          draft.phl_file,
          "attendance-phl-proofs",
        );

        if (upload.error) {
          setErrorMessage(upload.error);
          setSubmittingPeriod(false);
          return;
        }

        phlProofUrl = upload.url;
        phlProofName = upload.name;
      }

      const incomplete = isIncompleteRow(row, draft);
      const phlCandidate = isPotentialPHL(row, draft);

      const correctionType = phlCandidate
        ? "phl_confirmation"
        : meta.correctionType || incomplete
          ? "manual_check"
          : row.log?.id
            ? "attendance_confirmation"
            : "absence_or_manual_confirmation";

      const payload = {
        employee_id: employee.id,
        employee_number: employee.employee_number,
        machine_pin: employee.machine_pin,
        full_name: employee.full_name,
        department: employee.department,
        position: employee.position,

        attendance_date: row.date,
        check_in: row.log?.check_in || null,
        check_out: row.log?.check_out || null,
        total_punches: row.log?.total_punches || 0,
        work_duration_minutes: row.log?.work_duration_minutes || null,
        source: row.log?.source || "employee_manual_confirmation",
        status: getSubmittedStatus(row, draft),
        notes: row.log?.notes || null,

        employee_confirmation_status: "submitted",
        employee_confirmed_at: now,
        employee_confirmation_batch_id: batchId,

        manual_check_in: draft.manual_check_in || null,
        manual_check_out: draft.manual_check_out || null,
        requested_check_in: draft.manual_check_in || null,
        requested_check_out: draft.manual_check_out || null,
        employee_daily_note: draft.employee_daily_note || null,

        is_phl_candidate: phlCandidate,
        phl_proof_url: phlProofUrl || null,
        phl_proof_name: phlProofName || null,
        absence_proof_url: absenceProofUrl || null,
        absence_proof_name: absenceProofName || null,

        absence_request_type: meta.absenceRequestType,
        absence_request_label: meta.absenceRequestLabel,
        absence_request_status: meta.absenceRequestType ? "submitted" : null,
        absence_request_source: meta.absenceRequestType
          ? "employee_attendance_confirmation"
          : null,

        correction_status: "pending",
        correction_type: correctionType,
        correction_reason:
          draft.employee_daily_note ||
          `${meta.label} dari konfirmasi absensi employee.`,
        correction_submitted_by: appUser.email,
        correction_submitted_role: "employee",
        correction_submitted_at: now,

        supervisor_approval_status: "pending",
        supervisor_approved_by: null,
        supervisor_approved_at: null,
        supervisor_reviewed_by: null,
        supervisor_reviewed_at: null,
        supervisor_note: null,

        hr_approval_status: "pending",
        hr_approved_by: null,
        hr_approved_at: null,
        hr_final_status: "waiting_supervisor",

        correction_notes: appendCorrectionNote(
          row.log?.correction_notes || null,
          `${isSupervisorRejected ? "Employee RESUBMIT setelah reject atasan" : "Employee submit"} absensi periode ${formatDisplayDate(periodRange.start)} s.d. ${formatDisplayDate(periodRange.end)} dengan keterangan: ${meta.label}.`,
        ),

        updated_at: now,
      };

      if (hasExistingLog) {
        const { error } = await supabase
          .from("attendance_logs")
          .update(payload)
          .eq("id", row.log!.id);

        if (error) {
          setErrorMessage(error.message);
          setSubmittingPeriod(false);
          return;
        }
      } else {
        const { error } = await supabase.from("attendance_logs").insert({
          ...payload,
          created_at: now,
        });

        if (error) {
          setErrorMessage(error.message);
          setSubmittingPeriod(false);
          return;
        }
      }
    }

    const totals = calculatePeriodTotals(calendarRows, holidays, rowDrafts);
    const leaveMaturity = getLeaveMaturity(
      employee,
      periodRange.start,
      periodRange.end,
    );

    const { error: periodError } = await supabase
      .from("attendance_period_confirmations")
      .upsert(
        {
          id: confirmationId,

          employee_id: employee.id,
          employee_number: employee.employee_number,
          machine_pin: employee.machine_pin,
          full_name: employee.full_name,
          department: employee.department,
          position: employee.position,

          period_month: periodMonth,
          period_start: periodRange.start,
          period_end: periodRange.end,

          employee_status: "submitted",
          employee_submitted_at: now,
          employee_submitted_by: appUser.email,

          supervisor_status: "pending",
          supervisor_approved_at: null,
          supervisor_rejected_at: null,
          supervisor_name: null,
          supervisor_note: null,
          hr_status: "waiting_supervisor",
          hr_note: null,

          total_work_days: totals.totalWorkDays,
          total_present_days: totals.present,
          total_late_days: totals.late,
          total_incomplete_days: totals.incomplete,
          total_absent_days: totals.absent,
          total_sick_days: totals.sick,
          total_permit_days: totals.permit,
          total_leave_days: totals.leave,
          total_phl_days: totals.phl,
          total_holiday_work_days: totals.holidayWork,

          annual_leave_matured: leaveMaturity.matured,
          annual_leave_matured_date: leaveMaturity.date || null,
          leave_allowance_eligible: leaveMaturity.matured,

          is_locked: false,
          updated_at: now,
        },
        {
          onConflict: "employee_id,period_month",
        },
      );

    if (periodError) {
      setErrorMessage(periodError.message);
      setSubmittingPeriod(false);
      return;
    }

    const notificationResult = await sendAttendanceSubmitNotification({
      batchId,
      totals,
      submittedRows: rowsToSubmit.length,
    });

    setSuccessMessage(
      [
        `${isSupervisorRejected ? "Revisi absensi" : "Absensi"} periode ${formatDisplayDate(periodRange.start)} s.d. ${formatDisplayDate(periodRange.end)} berhasil ${isSupervisorRejected ? "dikirim ulang" : "dikirim"} ke atasan sebagai SATU PERIODE penuh.`,
        notificationResult.sent
          ? `Notifikasi email sudah dikirim ke ${notificationResult.totalRecipients} atasan.`
          : `Data berhasil tersimpan, tetapi email notifikasi belum terkirim: ${notificationResult.message}`,
      ].join(" "),
    );

    setSubmittingPeriod(false);
    await fetchData(false);
  }

  async function sendAttendanceSubmitNotification({
    batchId,
    totals,
    submittedRows,
  }: {
    batchId: string;
    totals: PeriodTotals;
    submittedRows: number;
  }) {
    try {
      if (!employee || !appUser) {
        return {
          sent: false,
          totalRecipients: 0,
          message: "Data employee atau user belum tersedia.",
        };
      }

      const recipients = await resolveSupervisorEmails(employee);

      if (recipients.length === 0) {
        return {
          sent: false,
          totalRecipients: 0,
          message:
            "Email atasan belum ditemukan. Pastikan atasan utama/atasan tambahan memiliki email pada master karyawan.",
        };
      }

      const appUrl =
        typeof window !== "undefined" ? window.location.origin : "";

      await sendHarmonyEmail({
        to: recipients,
        subject: `Pengajuan Absensi Menunggu Approval - ${employee.full_name || appUser.email}`,
        title: "Pengajuan Absensi Menunggu Approval",
        message: [
          `Ada pengajuan absensi baru yang menunggu approval atasan.`,
          ``,
          `Nama: ${employee.full_name || "-"}`,
          `NPK: ${employee.employee_number || "-"}`,
          `Departemen: ${employee.department || "-"}`,
          `Jabatan: ${employee.position || "-"}`,
          `Periode: ${formatDisplayDate(periodRange.start)} s.d. ${formatDisplayDate(periodRange.end)}`,
          `Jumlah hari disubmit: ${submittedRows}`,
          `Hadir: ${totals.present}`,
          `Cuti: ${totals.leave}`,
          `Izin: ${totals.permit}`,
          `Sakit: ${totals.sick}`,
          `Potensi/Klaim PHL: ${totals.phl + totals.phlClaim}`,
          ``,
          `Batch ID: ${batchId}`,
        ].join("\n"),
        actionLabel: "Buka HARMONY",
        actionUrl: appUrl ? `${appUrl}/login` : undefined,
        footer:
          "Email ini dikirim otomatis oleh HARMONY setelah employee melakukan submit absensi periode.",
      });

      return {
        sent: true,
        totalRecipients: recipients.length,
        message: "Email notifikasi berhasil dikirim.",
      };
    } catch (error: any) {
      return {
        sent: false,
        totalRecipients: 0,
        message: error?.message || "Email notifikasi gagal dikirim.",
      };
    }
  }

  async function resolveSupervisorEmails(currentEmployee: EmployeeProfile) {
    const references = new Set<string>();

    [
      currentEmployee.supervisor_1,
      currentEmployee.supervisor_2,
    ].forEach((item) => {
      const value = String(item || "").trim();

      if (value) references.add(value);
    });

    const { data: assignmentData } = await supabase
      .from("employee_assignments")
      .select("supervisor_1, supervisor_2, is_active")
      .eq("employee_id", currentEmployee.id)
      .eq("is_active", true);

    ((assignmentData || []) as EmployeeAssignment[]).forEach((assignment) => {
      [assignment.supervisor_1, assignment.supervisor_2].forEach((item) => {
        const value = String(item || "").trim();

        if (value) references.add(value);
      });
    });

    const referenceList = Array.from(references);
    const emailRefs = referenceList.filter(isValidEmail);
    const nameRefs = referenceList.filter((item) => !isValidEmail(item));

    const recipients = new Set<string>();

    emailRefs.forEach((email) => recipients.add(email.toLowerCase()));

    if (nameRefs.length > 0) {
      const { data: supervisorEmployees } = await supabase
        .from("employees")
        .select("full_name, email")
        .in("full_name", nameRefs);

      (supervisorEmployees || []).forEach((supervisor) => {
        const email = String(supervisor.email || "").trim().toLowerCase();

        if (isValidEmail(email)) {
          recipients.add(email);
        }
      });
    }

    if (recipients.size === 0 && currentEmployee.department) {
      const { data: hrUsers } = await supabase
        .from("app_users")
        .select("email, role, is_active")
        .eq("role", "hr")
        .eq("is_active", true);

      (hrUsers || []).forEach((user) => {
        const email = String(user.email || "").trim().toLowerCase();

        if (isValidEmail(email)) {
          recipients.add(email);
        }
      });
    }

    return Array.from(recipients);
  }

  function validateRowBeforeSubmit(row: CalendarDayRow) {
    const draft = getDraft(row);
    const meta = getDailyTypeMeta(draft.daily_type);
    const label = formatDisplayDate(row.date);
    const incomplete = isIncompleteRow(row, draft);
    const noMachineData = !row.log?.id;
    const hasManualTime = Boolean(
      draft.manual_check_in || draft.manual_check_out,
    );

    if (noMachineData && draft.daily_type === "present" && !hasManualTime) {
      if (row.is_weekend || row.holiday_name) {
        return "";
      }

      return `${label}: tidak ada data mesin. Isi manual jam atau pilih jenis keterangan seperti cuti, izin, sakit, klaim PHL, atau tugas luar.`;
    }

    if (meta.requiresManualTime && !hasManualTime) {
      return `${label}: ${meta.label} membutuhkan jam manual masuk/pulang.`;
    }

    if (
      (incomplete || (noMachineData && hasManualTime)) &&
      !draft.employee_daily_note.trim()
    ) {
      return `${label}: alasan/catatan wajib diisi untuk data manual atau absensi tidak lengkap.`;
    }

    if (incomplete) {
      if (!row.log?.check_in && !draft.manual_check_in) {
        return `${label}: check in kosong, isi jam manual terlebih dahulu.`;
      }

      if (!row.log?.check_out && !draft.manual_check_out) {
        return `${label}: check out kosong, isi jam manual terlebih dahulu.`;
      }
    }

    if (meta.isAbsenceLike && !draft.employee_daily_note.trim()) {
      return `${label}: catatan wajib diisi untuk ${meta.label}.`;
    }

    if (
      meta.requiresProof &&
      !row.log?.absence_proof_url &&
      !draft.absence_file
    ) {
      return `${label}: upload bukti/dokumen pendukung untuk ${meta.label}.`;
    }

    if (isPotentialPHL(row, draft)) {
      if (!row.log?.phl_proof_url && !draft.phl_file) {
        return `${label}: upload bukti perintah atasan untuk potensi PHL.`;
      }
    }

    return "";
  }

  function exportCsv() {
    const rows = calendarRows.map((row) => {
      const draft = getDraft(row);
      const meta = getDailyTypeMeta(draft.daily_type);

      return {
        periode: getPeriodLabel(periodMonth),
        full_name: employee?.full_name || "",
        employee_number: employee?.employee_number || "",
        machine_pin: employee?.machine_pin || "",
        department: employee?.department || "",
        position: employee?.position || "",
        attendance_date: row.date,
        day_name: row.day_name,
        check_in: row.log?.check_in || "",
        check_out: row.log?.check_out || "",
        manual_check_in:
          row.log?.manual_check_in || draft.manual_check_in || "",
        manual_check_out:
          row.log?.manual_check_out || draft.manual_check_out || "",
        duration: formatDuration(row.log?.work_duration_minutes),
        status: formatStatus(getDisplayStatus(row, draft), row.log),
        keterangan: row.log?.absence_request_label || meta.label,
        employee_confirmation_status:
          row.log?.employee_confirmation_status || "",
        supervisor_approval_status: row.log?.supervisor_approval_status || "",
        hr_final_status: row.log?.hr_final_status || "",
        phl_candidate: isPotentialPHL(row, draft) ? "YES" : "NO",
        holiday: row.holiday_name || (row.is_weekend ? "Weekend" : ""),
        period_locked: isPeriodLocked ? "YES" : isProcessReadOnly ? "READ_ONLY" : "NO",
      };
    });

    const headers = Object.keys(rows[0] || { periode: "", full_name: "" });

    const csv = [
      headers.join(","),
      ...rows.map((row) => {
        return headers
          .map((header) => {
            const value = String(row[header as keyof typeof row] ?? "");
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `rekap-absensi-${employee?.full_name || "employee"}-${periodMonth}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Topbar
        title="Absensi"
        description="Cek absensi periode, lengkapi data manual, pilih keterangan kehadiran/ketidakhadiran, lalu submit ke atasan."
      />

      <section className="space-y-6 p-4 md:p-6">
        {successMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <CheckCircle2 size={18} />
              Berhasil
            </div>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-700">
            <div className="mb-1 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Perhatian
            </div>
            {errorMessage}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[30px] border border-[#007aff]/15 bg-[#eef6ff] p-5 shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#007aff]/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#007aff]/15 bg-white px-3 py-1.5 text-xs font-bold text-[#0059b8] shadow-sm">
                <Clock3 size={15} />
                Absensi Harian · Tidak Menunggu Periode
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-[#1d1d1f] sm:text-2xl">
                Sedang bekerja di luar kantor dan tidak bisa fingerprint?
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#6e6e73]">
                Simpan jam masuk/pulang manual dan bukti langsung pada hari
                kejadian. Data akan otomatis ikut muncul pada periode absensi
                yang sesuai, meskipun file fingerprint periode tersebut belum
                di-upload HR.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#6e6e73]">
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                  Tersimpan langsung ke database
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                  Bukti tidak hilang saat upload fingerprint
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm">
                  Approval tetap lewat Submit Periode
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={openLiveManualAttendance}
              disabled={loading || !employee}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[18px] bg-[#007aff] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Clock3 size={18} />
              Absen Manual Sekarang
            </button>
          </div>
        </div>

        {isPeriodLocked && (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <Lock size={18} />
              Periode ini sudah dikunci HR
            </div>

            <p>
              Data absensi periode ini sudah dikunci oleh HR. Employee tidak
              bisa mengubah jam manual, upload bukti, memilih tanggal, atau
              submit ulang sampai HR membuka lock.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <LockInfo
                label="Dikunci oleh"
                value={periodLockInfo.lockedBy}
              />
              <LockInfo
                label="Tanggal lock"
                value={formatDateTime(periodLockInfo.lockedAt)}
              />
              <LockInfo
                label="Catatan HR"
                value={periodLockInfo.note}
              />
            </div>
          </div>
        )}


        {isSupervisorRejected && !isPeriodLocked && (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <AlertTriangle size={18} />
              Periode ditolak atasan — dibuka kembali untuk revisi
            </div>

            <p>
              Atasan mengembalikan periode ini. Kamu dapat membuka tombol
              Lengkapi, memperbaiki jam/keterangan/bukti, melakukan Reset bila
              diperlukan, lalu menekan Submit Periode untuk mengirim ulang
              SELURUH periode ke atasan.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <LockInfo
                label="Ditolak oleh"
                value={
                  periodConfirmation?.supervisor_name ||
                  rejectedDailyLog?.supervisor_reviewed_by ||
                  rejectedDailyLog?.supervisor_approved_by ||
                  "Atasan"
                }
              />
              <LockInfo
                label="Tanggal reject"
                value={formatDateTime(
                  periodConfirmation?.supervisor_rejected_at ||
                    rejectedDailyLog?.supervisor_reviewed_at ||
                    rejectedDailyLog?.updated_at ||
                    "",
                )}
              />
              <LockInfo
                label="Alasan reject"
                value={
                  periodConfirmation?.supervisor_note ||
                  rejectedDailyLog?.supervisor_note ||
                  rejectedDailyLog?.correction_notes ||
                  (rejectedDailyLog
                    ? `Absensi ${formatDisplayDate(
                        rejectedDailyLog.attendance_date,
                      )} perlu direvisi.`
                    : "Perlu revisi data absensi.")
                }
              />
            </div>
          </div>
        )}

        {!isPeriodLocked && !isProcessReadOnly && periodLockInfo.unlockedAt && (
          <div className="rounded-[28px] border border-green-200 bg-green-50 p-5 text-sm leading-6 text-green-700">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <LockOpen size={18} />
              Periode masih bisa direvisi
            </div>

            <p>
              HR membuka lock periode ini untuk kebutuhan revisi. Jika revisi
              sudah selesai, periode dapat dikunci kembali oleh HR.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <LockInfo
                label="Dibuka oleh"
                value={periodLockInfo.unlockedBy}
              />
              <LockInfo
                label="Tanggal unlock"
                value={formatDateTime(periodLockInfo.unlockedAt)}
              />
              <LockInfo
                label="Catatan HR"
                value={periodLockInfo.note}
              />
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Hadir"
            value={String(presentCount)}
            description="Hari dengan kehadiran"
            icon={<CheckCircle2 size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Incomplete"
            value={String(incompleteCount)}
            description="Jam masuk/pulang perlu dilengkapi"
            icon={<AlertTriangle size={22} />}
            tone="red"
          />

          <SummaryCard
            title="Tanpa Data"
            value={String(noRecordCount)}
            description="Bisa diisi manual / keterangan"
            icon={<Clock3 size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Potensi PHL"
            value={String(phlCandidateCount)}
            description="Weekend/libur dengan scan"
            icon={<CalendarDays size={22} />}
            tone="purple"
          />
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex min-w-0 flex-col gap-4 border-b border-black/5 p-4 sm:p-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,620px)] xl:items-start xl:gap-6">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Rekap Absensi Pribadi
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Periode {formatDisplayDate(periodRange.start)} s.d.{" "}
                {formatDisplayDate(periodRange.end)}.
              </p>

            </div>

            <div className="w-full min-w-0 xl:w-auto xl:max-w-[620px]">
              <div className="rounded-[24px] border border-[#d8e8ff] bg-[#f7fbff] p-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#0059b8]">
                  <CalendarDays size={15} />
                  Periode Absensi
                </div>

                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_110px] gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <select
                    aria-label="Pilih bulan periode absensi"
                    value={normalizePeriodMonth(periodMonth).split("-")[1]}
                    onChange={(event) =>
                      setPeriodMonth((current) =>
                        updatePeriodPart(current, "month", event.target.value),
                      )
                    }
                    className="harmony-input min-w-0 w-full sm:w-[160px]"
                  >
                    {ATTENDANCE_MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Pilih tahun periode absensi"
                    value={Number(normalizePeriodMonth(periodMonth).split("-")[0])}
                    onChange={(event) =>
                      setPeriodMonth((current) =>
                        updatePeriodPart(current, "year", event.target.value),
                      )
                    }
                    className="harmony-input min-w-0 w-full sm:w-[110px]"
                  >
                    {getAttendanceYearOptions().map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mt-2 text-[11px] font-semibold leading-5 text-[#6e6e73]">
                  Aktif: {getPeriodLabel(periodMonth)}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <button
                  type="button"
                  onClick={exportCsv}
                  className="harmony-button-secondary w-full sm:w-auto"
                >
                  <Download size={18} />
                  Export
                </button>

                <button
                  type="button"
                  onClick={() => fetchData()}
                  className="harmony-button-secondary w-full sm:w-auto"
                >
                  <RefreshCcw size={18} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <RefreshCcw size={18} className="animate-spin" />
              Memuat data absensi...
            </div>
          )}

          {!loading && (
            <>
              <div className="grid gap-5 border-b border-black/5 p-6">
                <div className="rounded-[28px] border border-black/5 bg-[#1d1d1f] p-6 text-white">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-white">
                      <Fingerprint size={24} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-semibold">
                        {employee?.full_name || appUser?.email || "Employee"}
                      </h3>

                      <p className="mt-1 text-sm text-white/55">
                        {employee?.employee_number || "-"} ·{" "}
                        {employee?.department || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ProfileRow
                      label="Machine PIN"
                      value={employee?.machine_pin || "-"}
                    />
                    <ProfileRow
                      label="Jabatan"
                      value={employee?.position || "-"}
                    />
                    <ProfileRow
                      label="Periode"
                      value={getPeriodLabel(periodMonth)}
                    />
                    <ProfileRow
                      label="Status Akses"
                      value={
                        isPeriodLocked
                          ? "Locked by HR"
                          : isSupervisorRejected
                            ? "Revisi Aktif"
                            : isProcessReadOnly
                              ? "Read Only"
                              : "Unlocked"
                      }
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#1d1d1f]">
                    Ringkasan Terakhir
                  </h3>


                  {latestLog ? (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                      <MiniInfoCard
                        title="Tanggal"
                        value={formatDisplayDate(latestLog.attendance_date)}
                      />
                      <MiniInfoCard
                        title="Check In"
                        value={latestLog.check_in || "-"}
                      />
                      <MiniInfoCard
                        title="Check Out"
                        value={latestLog.check_out || "-"}
                      />
                      <MiniInfoCard
                        title="Status"
                        value={formatStatus(
                          latestLog.status || "present",
                          latestLog,
                        )}
                      />
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[24px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-6 text-sm text-[#6e6e73]">
                      Belum ada data absensi pada periode ini, tetapi employee
                      tetap bisa menambahkan keterangan manual per tanggal
                      selama periode belum dikunci atau belum disubmit.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-b border-black/5 bg-[#f5f5f7]/70 p-6 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">
                    Konfirmasi Absensi Periode
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Centang harian hanya sebagai checklist pengecekan. Tombol
                    Submit Periode selalu mengirim seluruh data relevan dari
                    tanggal 11 sampai 10, bukan hanya tanggal yang dicentang.
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#007aff]">
                    Checklist review: {selectedRows.length} dari {selectableRows.length}{" "}
                    hari. Submit tetap mencakup seluruh periode.
                  </p>

                  {!isPeriodComplete && !isReadOnlyPeriod && (
                    <p className="mt-2 text-xs font-bold text-orange-700">
                      Periode belum selesai. Submit periode penuh tersedia mulai {formatDisplayDate(periodRange.end)}.
                    </p>
                  )}

                  {isSupervisorRejected && !isReadOnlyPeriod && (
                    <p className="mt-2 text-xs font-bold text-red-700">
                      Mode revisi aktif. Lengkapi data yang ditolak lalu kirim ulang seluruh periode.
                    </p>
                  )}

                  {isReadOnlyPeriod && (
                    <p className="mt-2 text-xs font-bold text-orange-700">
                      Tombol konfirmasi nonaktif karena periode sudah disubmit
                      atau dikunci.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={toggleSelectAllAttendance}
                    disabled={
                      selectableRows.length === 0 ||
                      isReadOnlyPeriod ||
                      submittingPeriod
                    }
                    className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={18} />
                    {allRowsSelected ? "Batal Centang Semua" : "Centang Semua"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitPeriod}
                    disabled={
                      !isPeriodComplete ||
                      isReadOnlyPeriod ||
                      submittingPeriod
                    }
                    className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={18} />
                    {submittingPeriod
                      ? "Mengirim Seluruh Periode..."
                      : isSupervisorRejected
                        ? "Kirim Ulang Seluruh Periode"
                        : "Submit Seluruh Periode ke Atasan"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 p-4 2xl:hidden">
                {calendarRows.map((row) => {
                  const draft = getDraft(row);
                  const displayStatus = getDisplayStatus(row, draft);
                  const isSelected = selectedDates.includes(row.date);
                  const isOffDayNoAttendance = isOffDayWithoutAttendance(
                    row,
                    draft,
                  );

                  return (
                    <div
                      key={row.date}
                      className={[
                        "rounded-[28px] border border-black/5 p-4 shadow-sm",
                        row.holiday_name
                          ? "bg-[#fff7e6]"
                          : row.is_weekend
                            ? "bg-[#f3f8ff]"
                            : "bg-white",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1d1d1f]">
                            {formatDisplayDate(row.date)}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[#6e6e73]">
                            {row.day_name}
                          </p>

                          {row.holiday_name && (
                            <p className="mt-1 line-clamp-2 text-[11px] font-bold text-orange-700">
                              {row.holiday_name}
                            </p>
                          )}
                        </div>

                        <AttendanceCheckButton
                          row={row}
                          draft={draft}
                          selected={isSelected}
                          disabled={isReadOnlyPeriod || submittingPeriod}
                          onClick={() => toggleAttendanceSelection(row)}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <MobileInfoBox
                          label="Clock In"
                          value={
                            row.log?.check_in || draft.manual_check_in || "-"
                          }
                          manual={Boolean(
                            draft.manual_check_in || row.log?.manual_check_in,
                          )}
                        />

                        <MobileInfoBox
                          label="Clock Out"
                          value={
                            row.log?.check_out || draft.manual_check_out || "-"
                          }
                          manual={Boolean(
                            draft.manual_check_out ||
                              row.log?.manual_check_out,
                          )}
                        />

                        <MobileInfoBox
                          label="Durasi"
                          value={formatDuration(row.log?.work_duration_minutes)}
                        />

                        <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                            Status
                          </p>

                          {isOffDayNoAttendance ? (
                            <span className="text-xs font-semibold text-[#86868b]">
                              -
                            </span>
                          ) : (
                            <StatusBadge status={displayStatus} log={row.log} />
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                            Keterangan
                          </p>
                          <RequestLabelBadge row={row} draft={draft} />
                        </div>

                        <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                            Validasi
                          </p>
                          <ValidationInfo row={row} draft={draft} />
                        </div>

                        <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
                                Approval
                              </p>
                              <ApprovalBadge
                                status={
                                  row.log?.supervisor_approval_status || "none"
                                }
                              />
                            </div>

                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                disabled={isReadOnlyPeriod || submittingPeriod}
                                onClick={() => openEdit(row)}
                                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <PencilLine size={15} />
                                Lengkapi
                              </button>
                              <button
                                type="button"
                                disabled={
                                  isReadOnlyPeriod ||
                                  submittingPeriod ||
                                  resettingDate === row.date ||
                                  !canShowResetButton(row)
                                }
                                onClick={() => handleResetVerification(row)}
                                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                title={
                                  canShowResetButton(row)
                                    ? "Reset data manual/verifikasi tanggal ini"
                                    : "Belum ada data yang dapat direset"
                                }
                              >
                                {resettingDate === row.date ? (
                                  <RefreshCcw size={15} className="animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto 2xl:block">
                <table className="min-w-[1320px] w-full table-fixed border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                      <th className="w-[58px] px-3 py-3 text-center font-semibold">
                        Cek
                      </th>
                      <th className="w-[100px] px-3 py-3 font-semibold">
                        Tanggal
                      </th>
                      <th className="w-[76px] px-3 py-3 font-semibold">Hari</th>
                      <th className="w-[96px] px-3 py-3 font-semibold">
                        Clock In
                      </th>
                      <th className="w-[96px] px-3 py-3 font-semibold">
                        Clock Out
                      </th>
                      <th className="w-[80px] px-3 py-3 font-semibold">Durasi</th>
                      <th className="w-[105px] px-3 py-3 font-semibold">
                        Status
                      </th>
                      <th className="w-[145px] px-3 py-3 font-semibold">
                        Keterangan
                      </th>
                      <th className="w-[170px] px-3 py-3 font-semibold">
                        Validasi
                      </th>
                      <th className="w-[105px] px-3 py-3 font-semibold">
                        Approval
                      </th>
                      <th className="w-[190px] px-3 py-3 text-center font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {calendarRows.map((row) => {
                      const draft = getDraft(row);
                      const displayStatus = getDisplayStatus(row, draft);
                      const isSelected = selectedDates.includes(row.date);
                      const isOffDayNoAttendance = isOffDayWithoutAttendance(
                        row,
                        draft,
                      );

                      return (
                        <tr
                          key={row.date}
                          className={[
                            "border-b border-black/5 transition",
                            row.holiday_name
                              ? "bg-[#fff7e6] hover:bg-[#fff1cc]"
                              : row.is_weekend
                                ? "bg-[#f3f8ff] hover:bg-[#e8f2ff]"
                                : "hover:bg-white/70",
                          ].join(" ")}
                        >
                          <td className="px-3 py-3 text-center">
                            <AttendanceCheckButton
                              row={row}
                              draft={draft}
                              selected={isSelected}
                              disabled={isReadOnlyPeriod || submittingPeriod}
                              onClick={() => toggleAttendanceSelection(row)}
                            />
                          </td>

                          <td className="px-3 py-3 font-semibold text-[#1d1d1f]">
                            {formatDisplayDate(row.date)}

                            {row.holiday_name && (
                              <p className="mt-1 line-clamp-1 text-[11px] font-bold text-orange-700">
                                {row.holiday_name}
                              </p>
                            )}
                          </td>

                          <td className="px-3 py-3 text-[#6e6e73]">
                            {row.day_name}
                          </td>

                          <td className="px-3 py-3 align-top">
                            <TimeCell
                              value={
                                row.log?.check_in ||
                                draft.manual_check_in ||
                                "-"
                              }
                              manual={Boolean(
                                draft.manual_check_in ||
                                row.log?.manual_check_in,
                              )}
                            />
                          </td>

                          <td className="px-3 py-3 align-top">
                            <TimeCell
                              value={
                                row.log?.check_out ||
                                draft.manual_check_out ||
                                "-"
                              }
                              manual={Boolean(
                                draft.manual_check_out ||
                                row.log?.manual_check_out,
                              )}
                            />
                          </td>

                          <td className="px-3 py-3 align-top text-[#1d1d1f]">
                            {formatDuration(row.log?.work_duration_minutes)}
                          </td>

                          <td className="px-3 py-3 align-top">
                            {isOffDayNoAttendance ? (
                              <span className="text-xs font-semibold text-[#86868b]">
                                -
                              </span>
                            ) : (
                              <StatusBadge
                                status={displayStatus}
                                log={row.log}
                              />
                            )}
                          </td>

                          <td className="px-3 py-3 align-top">
                            <RequestLabelBadge row={row} draft={draft} />
                          </td>

                          <td className="px-3 py-3 align-top">
                            <ValidationInfo row={row} draft={draft} />
                          </td>

                          <td className="px-3 py-3 align-top">
                            <ApprovalBadge
                              status={
                                row.log?.supervisor_approval_status || "none"
                              }
                            />
                          </td>

                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={isReadOnlyPeriod || submittingPeriod}
                                onClick={() => openEdit(row)}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl bg-[#e8f2ff] px-3 text-[11px] font-bold text-[#0059b8] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <PencilLine size={15} />
                                Lengkapi
                              </button>
                              <button
                                type="button"
                                disabled={
                                  isReadOnlyPeriod ||
                                  submittingPeriod ||
                                  resettingDate === row.date ||
                                  !canShowResetButton(row)
                                }
                                onClick={() => handleResetVerification(row)}
                                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl bg-red-50 px-3 text-[11px] font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                title={
                                  canShowResetButton(row)
                                    ? "Reset data manual/verifikasi tanggal ini"
                                    : "Belum ada data yang dapat direset"
                                }
                              >
                                {resettingDate === row.date ? (
                                  <RefreshCcw size={15} className="animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                                Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {liveManualOpen && (
          <LiveManualAttendanceModal
            employee={employee}
            record={liveManualRecord}
            form={liveManualForm}
            loading={liveManualLoading}
            saving={liveManualSaving}
            onChange={updateLiveManualForm}
            onDateChange={handleLiveManualDateChange}
            onSave={saveLiveManualAttendance}
            onClose={closeLiveManualAttendance}
          />
        )}

        {editOpen && selectedRow && (
          <EditAttendanceModal
            row={selectedRow}
            draft={getDraft(selectedRow)}
            requestTypes={requestTypes}
            locked={isPeriodLocked}
            saving={savingInlineManualDate === selectedRow.date}
            onChange={(field, value) =>
              updateRowDraft(selectedRow.date, field, value)
            }
            onSave={() => saveInlineManualVerification(selectedRow)}
            onClose={closeEdit}
          />
        )}
      </section>
    </>
  );
}

function LiveManualAttendanceModal({
  employee,
  record,
  form,
  loading,
  saving,
  onChange,
  onDateChange,
  onSave,
  onClose,
}: {
  employee: EmployeeProfile | null;
  record: AttendanceLog | null;
  form: LiveManualForm;
  loading: boolean;
  saving: boolean;
  onChange: <K extends keyof LiveManualForm>(
    field: K,
    value: LiveManualForm[K],
  ) => void;
  onDateChange: (date: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const periodMonth = getPeriodMonthForDate(form.attendance_date);
  const periodLabel = form.attendance_date
    ? getPeriodLabel(periodMonth)
    : "-";

  const hasMachineData = Boolean(
    record?.upload_id || record?.check_in || record?.check_out,
  );

  const hasExistingManual = Boolean(
    record?.manual_check_in ||
      record?.manual_check_out ||
      record?.requested_check_in ||
      record?.requested_check_out ||
      record?.employee_daily_note ||
      record?.correction_reason,
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_32px_100px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-5 sm:p-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#e8f2ff] px-3 py-1.5 text-xs font-bold text-[#0059b8]">
              <Clock3 size={14} />
              Absensi Manual Harian
            </div>

            <h2 className="text-xl font-semibold text-[#1d1d1f] sm:text-2xl">
              Kehadiran di Luar Kantor
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {employee?.full_name || "Employee"} · data disimpan sekarang dan
              akan otomatis masuk ke periode yang sesuai.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
          <div className="rounded-[24px] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
            <strong>Tidak perlu menunggu HR upload fingerprint.</strong> Jika
            nanti ada file fingerprint untuk tanggal yang sama, HARMONY hanya
            mengisi data mesin dan tetap mempertahankan jam manual, alasan,
            serta dokumen bukti ini.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="harmony-label">Tanggal Kehadiran</span>
              <input
                type="date"
                value={form.attendance_date}
                max={getTodayISO()}
                disabled={loading || saving}
                onChange={(event) => onDateChange(event.target.value)}
                className="harmony-input disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <ReadOnlyBox label="Masuk Periode" value={periodLabel} />
          </div>

          {loading ? (
            <div className="flex items-center gap-3 rounded-[22px] bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]">
              <RefreshCcw size={17} className="animate-spin" />
              Mengecek data tanggal ini...
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <LiveManualStatusBox
                label="Data Mesin"
                value={hasMachineData ? "Sudah ada" : "Belum ada"}
              />
              <LiveManualStatusBox
                label="Data Manual"
                value={hasExistingManual ? "Sudah tersimpan" : "Belum ada"}
              />
              <LiveManualStatusBox
                label="Bukti"
                value={
                  form.existing_proof_url || form.proof_file
                    ? "Tersedia"
                    : "Wajib upload"
                }
              />
            </div>
          )}

          {hasMachineData && (
            <div className="grid gap-4 md:grid-cols-2">
              <ReadOnlyBox
                label="Fingerprint Masuk"
                value={record?.check_in || "-"}
              />
              <ReadOnlyBox
                label="Fingerprint Pulang"
                value={record?.check_out || "-"}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="harmony-label">Manual Check In</span>
              <input
                type="time"
                value={form.manual_check_in}
                disabled={loading || saving}
                onChange={(event) =>
                  onChange("manual_check_in", event.target.value)
                }
                className="harmony-input disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="mt-1 text-[11px] leading-5 text-[#86868b]">
                Bisa diisi lebih dulu saat mulai bekerja.
              </p>
            </label>

            <label className="block">
              <span className="harmony-label">Manual Check Out</span>
              <input
                type="time"
                value={form.manual_check_out}
                disabled={loading || saving}
                onChange={(event) =>
                  onChange("manual_check_out", event.target.value)
                }
                className="harmony-input disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="mt-1 text-[11px] leading-5 text-[#86868b]">
                Dapat ditambahkan kemudian pada tanggal yang sama.
              </p>
            </label>
          </div>

          <label className="block">
            <span className="harmony-label">Keterangan / Alasan</span>
            <textarea
              value={form.reason}
              disabled={loading || saving}
              onChange={(event) => onChange("reason", event.target.value)}
              placeholder="Contoh: kunjungan lapangan, dinas luar, kegiatan eksternal, pekerjaan di lokasi lain, atau alasan tidak dapat fingerprint."
              className="harmony-textarea disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <div className="rounded-[26px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-[#1d1d1f]">
                  Bukti Pendukung
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Wajib. Bisa berupa surat tugas, instruksi atasan, foto
                  kegiatan, atau dokumen relevan lainnya.
                </p>
                <p className="mt-1 text-xs font-bold text-[#007aff]">
                  {form.proof_file?.name ||
                    form.existing_proof_name ||
                    "Belum ada file"}
                </p>
              </div>

              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#007aff] shadow-sm transition hover:bg-[#e8f2ff]">
                <Upload size={17} />
                Pilih Bukti
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  disabled={loading || saving}
                  onChange={(event) =>
                    onChange("proof_file", event.target.files?.[0] || null)
                  }
                />
              </label>
            </div>

            {form.existing_proof_url && (
              <a
                href={form.existing_proof_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#007aff]"
              >
                <FileText size={16} />
                Lihat bukti yang sudah tersimpan
              </a>
            )}
          </div>

          <div className="rounded-[22px] border border-green-100 bg-green-50 p-4 text-xs leading-6 text-green-700">
            Data ini <strong>belum otomatis dikirim ke atasan</strong>. Saat
            periode absensi dibuka/review, data manual akan muncul di tabel
            dan mengikuti tombol <strong>Submit Periode ke Atasan</strong>
            seperti flow yang sudah digunakan sekarang.
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 p-5 sm:flex-row sm:justify-end sm:p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="harmony-button-secondary disabled:opacity-60"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={loading || saving}
            className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCcw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {saving ? "Menyimpan..." : "Simpan ke Database"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveManualStatusBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[#f5f5f7]/80 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#1d1d1f]">{value}</p>
    </div>
  );
}

function EditAttendanceModal({
  row,
  draft,
  requestTypes,
  locked,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  row: CalendarDayRow;
  draft: RowDraft;
  requestTypes: HarmonyRequestTypeDefinition[];
  locked: boolean;
  saving: boolean;
  onChange: (field: keyof RowDraft, value: string | File | null) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const incomplete = isIncompleteRow(row, draft);
  const noMachineData = !row.log?.id;
  const phl = isPotentialPHL(row, draft);
  const meta = getDailyTypeMeta(draft.daily_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">
              Lengkapi Absensi
            </h2>

            <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
              {formatDisplayDate(row.date)} · {row.day_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#1d1d1f]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          {locked && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              Periode ini sudah dikunci HR. Data hanya bisa dilihat dan tidak
              bisa diubah.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <ReadOnlyBox
              label="Data Mesin Masuk"
              value={row.log?.check_in || "-"}
            />
            <ReadOnlyBox
              label="Data Mesin Pulang"
              value={row.log?.check_out || "-"}
            />
            <ReadOnlyBox
              label="Status Awal"
              value={formatStatus(row.status, row.log)}
            />
          </div>

          <label className="block">
            <span className="harmony-label">Jenis Keterangan</span>
            <select
              value={draft.daily_type}
              disabled={locked}
              onChange={(event) =>
                onChange("daily_type", event.target.value as DailyType)
              }
              className="harmony-select disabled:cursor-not-allowed disabled:opacity-60"
            >
              {groupHarmonyTypes(
                getActiveHarmonyTypesForScope(requestTypes, "attendance"),
              ).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}

              {!getActiveHarmonyTypesForScope(requestTypes, "attendance").some(
                (item) => item.code === draft.daily_type,
              ) && (
                <option value={draft.daily_type}>
                  {getHarmonyRequestTypeMeta(draft.daily_type).label} (historis)
                </option>
              )}
            </select>
          </label>

          <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7]/80 p-4 text-sm leading-6 text-[#6e6e73]">
            <p className="font-semibold text-[#1d1d1f]">{meta.label}</p>
            <p className="mt-1">{getDailyTypeDescription(draft.daily_type)}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="harmony-label">Manual Check In</span>
              <input
                type="time"
                value={draft.manual_check_in}
                disabled={locked}
                onChange={(event) =>
                  onChange("manual_check_in", event.target.value)
                }
                className="harmony-input disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="harmony-label">Manual Check Out</span>
              <input
                type="time"
                value={draft.manual_check_out}
                disabled={locked}
                onChange={(event) =>
                  onChange("manual_check_out", event.target.value)
                }
                className="harmony-input disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <label className="block">
            <span className="harmony-label">Catatan / Alasan</span>
            <textarea
              value={draft.employee_daily_note}
              disabled={locked}
              onChange={(event) =>
                onChange("employee_daily_note", event.target.value)
              }
              placeholder="Contoh: cuti menikah, klaim PHL, tugas luar daerah, lupa scan pulang, sakit, izin, atau keterangan lainnya."
              className="harmony-textarea disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          {(incomplete ||
            noMachineData ||
            meta.isAbsenceLike ||
            meta.requiresProof) && (
            <FilePickerBox
              title="Upload Bukti / Dokumen Pendukung"
              description={
                meta.requiresProof
                  ? `Wajib untuk ${meta.label}.`
                  : "Upload dokumen jika diperlukan untuk validasi atasan/HR."
              }
              file={draft.absence_file}
              existingUrl={row.log?.absence_proof_url || ""}
              existingName={row.log?.absence_proof_name || ""}
              disabled={locked}
              onChange={(file) => onChange("absence_file", file)}
            />
          )}

          {phl && (
            <FilePickerBox
              title="Upload Bukti Perintah Atasan / PHL"
              description="Wajib untuk kerja pada Sabtu/Minggu atau libur aktif."
              file={draft.phl_file}
              existingUrl={row.log?.phl_proof_url || ""}
              existingName={row.log?.phl_proof_name || ""}
              disabled={locked}
              onChange={(file) => onChange("phl_file", file)}
            />
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-black/5 p-6 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={locked ? onClose : onSave}
            disabled={saving}
            className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCcw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {locked
              ? "Tutup"
              : saving
                ? "Menyimpan..."
                : draft.daily_type === "manual_attendance" ||
                    draft.manual_check_in ||
                    draft.manual_check_out
                  ? "Simpan Manual ke Database"
                  : "Simpan Sementara"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilePickerBox({
  title,
  description,
  file,
  existingUrl,
  existingName,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  file: File | null;
  existingUrl: string;
  existingName: string;
  disabled: boolean;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-semibold text-[#1d1d1f]">{title}</h3>

          <p className="mt-1 text-sm leading-6 text-[#6e6e73]">{description}</p>

          <p className="mt-1 text-xs font-bold text-[#007aff]">
            {file?.name || existingName || "Belum ada file dipilih"}
          </p>
        </div>

        <label
          className={[
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-[#007aff] shadow-sm transition",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-[#e8f2ff]",
          ].join(" ")}
        >
          <Upload size={17} />
          Pilih File
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            disabled={disabled}
            onChange={(event) => onChange(event.target.files?.[0] || null)}
          />
        </label>
      </div>

      {existingUrl && (
        <a
          href={existingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#007aff]"
        >
          <FileText size={16} />
          Lihat bukti yang sudah tersedia
        </a>
      )}
    </div>
  );
}

function AttendanceCheckButton({
  selected,
  disabled,
  onClick,
}: {
  row: CalendarDayRow;
  draft: RowDraft;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "mx-auto flex h-9 w-9 items-center justify-center rounded-2xl border text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-[#007aff] bg-[#007aff] text-white shadow-sm"
          : "border-[#007aff]/30 bg-white text-[#007aff] hover:border-[#007aff] hover:bg-[#e8f2ff]",
      ].join(" ")}
      title={selected ? "Batalkan pilihan" : "Pilih hari absensi"}
    >
      {selected ? (
        <CheckCircle2 size={17} />
      ) : (
        <span className="h-3.5 w-3.5 rounded-[5px] border-2 border-current" />
      )}
    </button>
  );
}

function RequestLabelBadge({
  row,
  draft,
}: {
  row: CalendarDayRow;
  draft: RowDraft;
}) {
  const label =
    row.log?.absence_request_label || getDailyTypeMeta(draft.daily_type).label;

  if (isOffDayWithoutAttendance(row, draft)) {
    return <span className="text-xs font-semibold text-[#86868b]">-</span>;
  }

  return (
    <span className="inline-flex rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#1d1d1f]">
      {label}
    </span>
  );
}

function ValidationInfo({
  row,
  draft,
}: {
  row: CalendarDayRow;
  draft: RowDraft;
}) {
  const incomplete = isIncompleteRow(row, draft);
  const phl = isPotentialPHL(row, draft);
  const noRecord = !row.log;
  const meta = getDailyTypeMeta(draft.daily_type);

  if (phl) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-bold text-[#7b2cbf]">Potensi PHL</p>
        <p className="text-xs leading-5 text-[#6e6e73]">
          Wajib bukti perintah atasan.
        </p>
      </div>
    );
  }

  if (meta.isAbsenceLike) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-bold text-[#0059b8]">{meta.label}</p>
        <p className="text-xs leading-5 text-[#6e6e73]">
          Menunggu validasi atasan.
        </p>
      </div>
    );
  }

  if (incomplete) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-bold text-orange-700">Perlu koreksi jam</p>
        <p className="text-xs leading-5 text-[#6e6e73]">
          Check in/out belum lengkap.
        </p>
      </div>
    );
  }

  if (noRecord && !isOffDayWithoutAttendance(row, draft)) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-bold text-red-700">Perlu keterangan</p>
        <p className="text-xs leading-5 text-[#6e6e73]">
          Tidak ada data mesin.
        </p>
      </div>
    );
  }

  return <span className="text-xs font-semibold text-green-700">Clear</span>;
}

function TimeCell({ value, manual }: { value: string; manual: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-2 font-semibold text-[#1d1d1f]">
        <Timer
          size={14}
          className={manual ? "text-[#007aff]" : "text-[#86868b]"}
        />
        {value}
      </div>

      {manual && (
        <p className="mt-1 text-[11px] font-bold text-[#007aff]">Manual</p>
      )}
    </div>
  );
}

function MobileInfoBox({
  label,
  value,
  manual = false,
}: {
  label: string;
  value: string;
  manual?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2 font-semibold text-[#1d1d1f]">
        <Timer
          size={14}
          className={manual ? "text-[#007aff]" : "text-[#86868b]"}
        />
        <span className="truncate">{value}</span>
      </div>

      {manual && (
        <p className="mt-1 text-[11px] font-bold text-[#007aff]">Manual</p>
      )}
    </div>
  );
}

function ReadOnlyBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="harmony-label">{label}</span>

      <div className="flex min-h-12 items-center rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 text-sm font-semibold text-[#1d1d1f]">
        {value}
      </div>
    </div>
  );
}

function LockInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/65 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold">{value}</p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone: "blue" | "green" | "orange" | "red" | "purple";
}) {
  const toneClass = {
    blue: "text-[#007aff] bg-[#e8f2ff]",
    green: "text-[#168034] bg-[#eaf8ee]",
    orange: "text-[#b35b00] bg-[#fff4e5]",
    red: "text-red-700 bg-red-50",
    purple: "text-[#7b2cbf] bg-[#f7edfc]",
  }[tone];

  return (
    <div className="harmony-card harmony-hover-lift p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6e6e73]">{title}</p>

          <h3 className="mt-2 truncate text-3xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1 line-clamp-1 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function MiniInfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-[#f5f5f7]/70 p-4">
      <p className="truncate text-xs font-semibold text-[#6e6e73]">{title}</p>

      <p className="mt-2 truncate text-xl font-semibold text-[#1d1d1f]">
        {value}
      </p>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/10 px-4 py-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/45">
        {label}
      </span>

      <span className="mt-1 block break-words text-sm font-semibold leading-5 text-white">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
  log,
}: {
  status: string;
  log?: AttendanceLog | null;
}) {
  const className =
    status === "present"
      ? "bg-green-50 text-green-700"
      : status === "late"
        ? "bg-orange-50 text-orange-700"
        : status === "incomplete"
          ? "bg-red-50 text-red-700"
          : status === "absent"
            ? "bg-red-50 text-red-700"
            : status === "phl" ||
                status === "pending_phl" ||
                status === "phl_claim"
              ? "bg-[#f7edfc] text-[#7b2cbf]"
              : status === "leave" ||
                  status.includes("leave") ||
                  status === "permit"
                ? "bg-[#e8f2ff] text-[#0059b8]"
                : status === "sick"
                  ? "bg-[#f7edfc] text-[#7b2cbf]"
                  : status === "official_travel"
                    ? "bg-[#eef1f5] text-[#3a3a3c]"
                    : "bg-[#f5f5f7] text-[#6e6e73]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${className}`}
    >
      {formatStatus(status, log)}
    </span>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const className =
    status === "approved"
      ? "bg-green-50 text-green-700"
      : status === "rejected"
        ? "bg-red-50 text-red-700"
        : status === "pending"
          ? "bg-orange-50 text-orange-700"
          : "bg-[#f5f5f7] text-[#6e6e73]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {formatApprovalStatus(status)}
    </span>
  );
}

function PeriodStatusBadge({
  period,
}: {
  period: AttendancePeriodConfirmation | null;
}) {
  const locked = Boolean(period?.is_locked);

  const className = locked
    ? "bg-red-50 text-red-700"
    : period?.hr_status === "finalized"
      ? "bg-green-50 text-green-700"
      : period?.supervisor_status === "approved"
        ? "bg-green-50 text-green-700"
        : period?.supervisor_status === "pending"
          ? "bg-orange-50 text-orange-700"
          : period?.supervisor_status === "rejected"
            ? "bg-red-50 text-red-700"
            : "bg-[#f5f5f7] text-[#6e6e73]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {formatPeriodStatus(period)}
    </span>
  );
}

function isOffDayWithoutAttendance(row: CalendarDayRow, draft?: RowDraft) {
  const hasAttendance = Boolean(
    row.log?.check_in ||
    row.log?.check_out ||
    row.log?.manual_check_in ||
    row.log?.manual_check_out ||
    draft?.manual_check_in ||
    draft?.manual_check_out,
  );

  const meta = draft ? getDailyTypeMeta(draft.daily_type) : null;
  const hasAbsenceInfo = Boolean(meta?.isAbsenceLike);

  return (
    (row.is_weekend || Boolean(row.holiday_name)) &&
    !hasAttendance &&
    !hasAbsenceInfo
  );
}

function inferDailyType(row: CalendarDayRow): DailyType {
  const type = String(row.log?.absence_request_type || row.log?.status || "").trim();

  if (type) {
    const knownType = getHarmonyRequestTypesCache().find(
      (item) => item.code === type,
    );

    if (knownType) return knownType.code;
  }

  if (type === "permission") return "permit";
  if (type === "alpa") return "absent";

  if (row.log?.manual_check_in || row.log?.manual_check_out) {
    return "manual_attendance";
  }

  if (!row.log?.id && (row.is_weekend || row.holiday_name)) {
    return "present";
  }

  return row.log?.id ? "present" : "absent";
}

function getEffectiveCheckIn(row: CalendarDayRow, draft?: RowDraft) {
  return (
    row.log?.check_in ||
    draft?.manual_check_in ||
    row.log?.manual_check_in ||
    row.log?.requested_check_in ||
    ""
  );
}

function getEffectiveCheckOut(row: CalendarDayRow, draft?: RowDraft) {
  return (
    row.log?.check_out ||
    draft?.manual_check_out ||
    row.log?.manual_check_out ||
    row.log?.requested_check_out ||
    ""
  );
}

function isIncompleteRow(row: CalendarDayRow, draft?: RowDraft) {
  const meta = draft ? getDailyTypeMeta(draft.daily_type) : null;

  if (meta?.isAbsenceLike) return false;

  const effectiveIn = getEffectiveCheckIn(row, draft);
  const effectiveOut = getEffectiveCheckOut(row, draft);
  const hasAnyAttendanceTime = Boolean(effectiveIn || effectiveOut);

  return hasAnyAttendanceTime && !(effectiveIn && effectiveOut);
}

function isPotentialPHL(row: CalendarDayRow, draft?: RowDraft) {
  const meta = draft ? getDailyTypeMeta(draft.daily_type) : null;

  if (meta?.isPHLClaim) return false;

  const hasAttendance = Boolean(
    row.log?.check_in ||
    row.log?.check_out ||
    row.log?.manual_check_in ||
    row.log?.manual_check_out ||
    draft?.manual_check_in ||
    draft?.manual_check_out,
  );

  return hasAttendance && (row.is_weekend || Boolean(row.holiday_name));
}

function getSubmittedStatus(row: CalendarDayRow, draft: RowDraft) {
  const meta = getDailyTypeMeta(draft.daily_type);

  if (isPotentialPHL(row, draft)) return "present";
  if (meta.status) return meta.status;
  if (row.log?.status) return row.log.status;
  if (draft.manual_check_in || draft.manual_check_out) return "present";
  if (row.is_weekend || row.holiday_name) return "off_day";

  return "absent";
}

function getDisplayStatus(row: CalendarDayRow, draft: RowDraft) {
  const meta = getDailyTypeMeta(draft.daily_type);

  if (isPotentialPHL(row, draft)) {
    if (row.log?.supervisor_approval_status === "approved") return "phl";
    return "pending_phl";
  }

  if (meta.isAbsenceLike) return meta.status;
  if (isOffDayWithoutAttendance(row, draft)) return "off_day";

  const effectiveIn = getEffectiveCheckIn(row, draft);
  const effectiveOut = getEffectiveCheckOut(row, draft);

  if (effectiveIn && effectiveOut) {
    // Late tetap merupakan kehadiran; badge harian boleh tetap "Late"
    // bila sumber mesin memang menandainya demikian.
    if (
      row.log?.status === "late" &&
      !draft.manual_check_in &&
      !draft.manual_check_out &&
      draft.daily_type !== "manual_attendance"
    ) {
      return "late";
    }

    return "present";
  }

  if (effectiveIn || effectiveOut) {
    return "incomplete";
  }

  if (row.log?.absence_request_type) {
    return row.log.absence_request_type;
  }

  return row.status;
}

function getDayStatus(
  log: AttendanceLog | null,
  isWeekend: boolean,
  isHoliday: boolean,
) {
  if (log?.absence_request_type) return log.absence_request_type;
  if (log?.status) return log.status;
  if (isWeekend || isHoliday) return "off_day";

  return "no_record";
}

type AttendanceSummaryBucket =
  | "present"
  | "incomplete"
  | "no_record"
  | "phl"
  | "other";

function classifyAttendanceSummary(
  row: CalendarDayRow,
  draft: RowDraft,
): AttendanceSummaryBucket {
  const meta = getDailyTypeMeta(draft.daily_type);

  // Cuti, izin, sakit, tugas luar, alpa, klaim PHL, dll tidak boleh
  // ikut dihitung sebagai "Tanpa Data".
  if (meta.isAbsenceLike) {
    return "other";
  }

  if (isPotentialPHL(row, draft)) {
    return "phl";
  }

  const effectiveIn = getEffectiveCheckIn(row, draft);
  const effectiveOut = getEffectiveCheckOut(row, draft);
  const hasAnyAttendanceTime = Boolean(effectiveIn || effectiveOut);

  // Hadir = pasangan jam efektif lengkap, baik dari fingerprint,
  // manual, maupun kombinasi fingerprint + manual.
  if (effectiveIn && effectiveOut) {
    return "present";
  }

  // Hanya salah satu sisi tersedia.
  if (hasAnyAttendanceTime) {
    return "incomplete";
  }

  // Weekend/libur tanpa aktivitas bukan "Tanpa Data".
  if (row.is_weekend || row.holiday_name) {
    return "other";
  }

  // Jika ada record keterangan employee meskipun tanpa jam,
  // jangan duplikasi sebagai Tanpa Data.
  const hasEmployeeExplanation = Boolean(
    row.log?.absence_request_type ||
      row.log?.absence_request_label ||
      row.log?.employee_daily_note ||
      row.log?.correction_reason ||
      draft.employee_daily_note ||
      draft.daily_type !== "present",
  );

  if (hasEmployeeExplanation) {
    return "other";
  }

  return "no_record";
}

function calculatePeriodTotals(
  calendarRows: CalendarDayRow[],
  holidays: Holiday[],
  rowDrafts: Record<string, RowDraft>,
): PeriodTotals {
  const result: PeriodTotals = {
    totalWorkDays: 0,
    present: 0,
    late: 0,
    incomplete: 0,
    absent: 0,
    sick: 0,
    permit: 0,
    leave: 0,
    phl: 0,
    phlClaim: 0,
    officialTravel: 0,
    holidayWork: 0,
  };

  calendarRows.forEach((row) => {
    const draft = rowDrafts[row.date] || {
      daily_type: inferDailyType(row),
      manual_check_in:
        row.log?.manual_check_in || row.log?.requested_check_in || "",
      manual_check_out:
        row.log?.manual_check_out || row.log?.requested_check_out || "",
      employee_daily_note:
        row.log?.employee_daily_note || row.log?.correction_reason || "",
      absence_file: null,
      phl_file: null,
    };

    const isHoliday = holidays.some(
      (holiday) => holiday.holiday_date === row.date,
    );
    const isOffday = row.is_weekend || isHoliday;
    const status = getDisplayStatus(row, draft);
    const meta = getDailyTypeMeta(draft.daily_type);

    if (!isOffday) {
      result.totalWorkDays += 1;
    }

    if (status === "phl" || status === "pending_phl") {
      result.phl += 1;
      result.holidayWork += 1;
      return;
    }

    if (meta.isPHLClaim || status === "phl_claim") {
      result.phlClaim += 1;
      return;
    }

    if (status === "late") {
      result.late += 1;
      result.present += 1;
      return;
    }

    if (status === "incomplete") {
      result.incomplete += 1;
      result.present += 1;
      return;
    }

    if (status === "present") {
      result.present += 1;
      return;
    }

    if (status === "sick") {
      result.sick += 1;
      return;
    }

    if (status === "permit") {
      result.permit += 1;
      return;
    }

    if (meta.isLeaveLike || status.includes("leave") || status === "leave") {
      result.leave += 1;
      return;
    }

    if (status === "official_travel") {
      result.officialTravel += 1;
      return;
    }

    if (status === "absent" || status === "no_record") {
      if (!isOffday) {
        result.absent += 1;
      }
    }
  });

  return result;
}

function getDailyTypeMeta(type: DailyType): DailyTypeMeta {
  const master = getHarmonyRequestTypeMeta(type);
  const attendanceOnly =
    master.request_category === "attendance" && !master.is_absence_like;

  return {
    label: master.label,
    status: master.attendance_status || master.code || "absent",
    correctionType: master.correction_type || master.code || "other",
    absenceRequestType: attendanceOnly ? null : master.code,
    absenceRequestLabel: attendanceOnly ? null : master.label,
    requiresProof: Boolean(master.requires_proof),
    requiresManualTime: Boolean(master.requires_manual_time),
    isLeaveLike: Boolean(master.is_leave_like),
    isAbsenceLike: Boolean(master.is_absence_like),
    isPHLClaim: Boolean(master.is_phl_claim),
  };
}

function getDailyTypeDescription(type: DailyType) {
  const meta = getHarmonyRequestTypeMeta(type);

  if (meta.description) return meta.description;

  if (meta.requires_manual_time) {
    return "Jenis ini membutuhkan jam manual dan mengikuti validasi attendance HARMONY.";
  }

  if (meta.requires_proof) {
    return "Jenis ini membutuhkan bukti/dokumen pendukung untuk proses validasi.";
  }

  return "Jenis kehadiran/ketidakhadiran ini mengikuti master HARMONY dan proses approval yang berlaku.";
}

function appendCorrectionNote(existing: string | null, next: string) {
  const timestamp = new Date().toLocaleString("id-ID");

  if (!existing) {
    return `[${timestamp}] ${next}`;
  }

  return `${existing}\n[${timestamp}] ${next}`;
}

function getLeaveMaturity(
  employee: EmployeeProfile,
  periodStart: string,
  periodEnd: string,
) {
  const joinDate = employee.join_date || "";

  if (!joinDate) {
    return {
      matured: false,
      date: "",
    };
  }

  const join = new Date(`${joinDate}T00:00:00`);

  if (Number.isNaN(join.getTime())) {
    return {
      matured: false,
      date: "",
    };
  }

  const periodStartDate = new Date(`${periodStart}T00:00:00`);
  const periodEndDate = new Date(`${periodEnd}T00:00:00`);

  let maturedDate = new Date(
    periodStartDate.getFullYear(),
    join.getMonth(),
    join.getDate(),
  );

  if (maturedDate < periodStartDate) {
    maturedDate = new Date(
      periodStartDate.getFullYear() + 1,
      join.getMonth(),
      join.getDate(),
    );
  }

  const alreadyOneYear = maturedDate.getFullYear() - join.getFullYear() >= 1;

  const matured =
    alreadyOneYear &&
    maturedDate >= periodStartDate &&
    maturedDate <= periodEndDate;

  return {
    matured,
    date: matured ? formatDateToISO(maturedDate) : "",
  };
}

const ATTENDANCE_START_YEAR = 2026;

const ATTENDANCE_MONTH_OPTIONS = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

function getAttendanceYearOptions() {
  const currentYear = new Date().getFullYear();
  const lastVisibleYear = Math.max(currentYear + 10, ATTENDANCE_START_YEAR + 10);

  return Array.from(
    { length: lastVisibleYear - ATTENDANCE_START_YEAR + 1 },
    (_, index) => ATTENDANCE_START_YEAR + index,
  );
}

function normalizePeriodMonth(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return getCurrentPeriodMonth();
  }

  const year = Math.max(Number(match[1]), ATTENDANCE_START_YEAR);
  const monthNumber = Math.min(Math.max(Number(match[2]), 1), 12);
  const month = String(monthNumber).padStart(2, "0");

  return `${year}-${month}`;
}

function updatePeriodPart(
  currentPeriod: string,
  part: "month" | "year",
  value: string,
) {
  const normalized = normalizePeriodMonth(currentPeriod);
  const [year, month] = normalized.split("-");

  if (part === "year") {
    const nextYear = Math.max(Number(value || year), ATTENDANCE_START_YEAR);
    return `${nextYear}-${month}`;
  }

  const nextMonth = String(
    Math.min(Math.max(Number(value || month), 1), 12),
  ).padStart(2, "0");

  return `${year}-${nextMonth}`;
}

function getTodayISO() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const map = new Map(parts.map((part) => [part.type, part.value]));

  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
}

function getPeriodMonthForDate(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return getCurrentPeriodMonth();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (day >= 11) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  const previous = new Date(year, month - 2, 1);

  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentPeriodMonth() {
  const today = new Date();
  const day = today.getDate();

  const period = new Date(today);

  if (day <= 10) {
    period.setMonth(period.getMonth() - 1);
  }

  const periodMonth = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`;

  return periodMonth < "2026-01" ? "2026-01" : periodMonth;
}

function getCutoffRange(periodMonth: string) {
  const [yearText, monthText] = periodMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  const start = new Date(year, month - 1, 11);
  const end = new Date(year, month, 10);

  return {
    start: formatDateToISO(start),
    end: formatDateToISO(end),
  };
}

function getDateRange(start: string, end: string) {
  const result: string[] = [];
  const current = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  while (current <= endDate) {
    result.push(formatDateToISO(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function getPeriodLabel(periodMonth: string) {
  const range = getCutoffRange(periodMonth);

  return `${formatDisplayDate(range.start)} - ${formatDisplayDate(range.end)}`;
}

function isWeekendDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  const day = date.getDay();

  return day === 0 || day === 6;
}

function formatDateToISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayName(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
  });
}

function formatStatus(status: string, log?: AttendanceLog | null) {
  if (log?.absence_request_label) return log.absence_request_label;

  if (status === "annual_leave") return "Cuti Tahunan";
  if (status === "marriage_leave") return "Cuti Menikah";
  if (status === "maternity_leave") return "Cuti Melahirkan";
  if (status === "miscarriage_leave") return "Cuti Keguguran";
  if (status === "bereavement_leave") return "Cuti Duka";
  if (status === "child_circumcision_leave") return "Cuti Khitan / Baptis Anak";
  if (status === "worship_leave") return "Cuti Ibadah";
  if (status === "menstrual_leave") return "Cuti Haid";
  if (status === "pregnancy_check_leave") return "Pemeriksaan Kehamilan";
  if (status === "phl_claim") return "Klaim PHL";
  if (status === "phl") return "PHL";
  if (status === "pending_phl") return "Menunggu PHL";
  if (status === "off_day") return "-";
  if (status === "present") return "Present";
  if (status === "late") return "Late";
  if (status === "incomplete") return "Incomplete";
  if (status === "absent") return "Alpa";
  if (status === "leave") return "Cuti";
  if (status === "sick") return "Sakit";
  if (status === "permit") return "Izin";
  if (status === "permission") return "Izin";
  if (status === "official_travel") return "Tugas Luar";
  if (status === "holiday") return "Holiday";
  if (status === "weekend") return "Weekend";
  if (status === "no_record") return "Tanpa Data";

  return status;
}

function formatApprovalStatus(status: string) {
  if (status === "none") return "-";
  if (status === "pending") return "Menunggu";
  if (status === "approved") return "Disetujui";
  if (status === "rejected") return "Ditolak";

  return status || "-";
}

function formatPeriodStatus(period: AttendancePeriodConfirmation | null) {
  if (!period) return "Belum disubmit ke atasan.";
  if (period.is_locked) return "Dikunci HR.";
  if (period.hr_status === "finalized") return "Sudah difinalisasi HR.";
  if (period.hr_status === "ready_for_hr")
    return "Sudah disetujui atasan dan siap diproses HR.";
  if (period.supervisor_status === "approved")
    return "Sudah disetujui atasan dan menunggu HR.";
  if (period.supervisor_status === "rejected")
    return "Ditolak atasan. Perlu revisi employee.";
  if (period.supervisor_status === "pending")
    return "Sudah dikirim dan sedang menunggu approval atasan.";
  if (period.employee_status === "submitted")
    return "Sudah disubmit oleh employee.";

  return "Belum disubmit ke atasan.";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function formatDuration(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${hours}j ${minutes}m`;
}
