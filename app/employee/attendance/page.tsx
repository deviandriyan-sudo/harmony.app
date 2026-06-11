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
  Upload,
  X,
} from "lucide-react";

import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/lib/supabase";

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
  locked_at?: string | null;
  unlocked_by?: string | null;
  unlocked_at?: string | null;
  lock_note?: string | null;
};

type DailyType =
  | "present"
  | "manual_attendance"
  | "annual_leave"
  | "marriage_leave"
  | "maternity_leave"
  | "miscarriage_leave"
  | "bereavement_leave"
  | "child_circumcision_leave"
  | "worship_leave"
  | "menstrual_leave"
  | "pregnancy_check_leave"
  | "phl_claim"
  | "official_travel"
  | "sick"
  | "permit"
  | "absent";

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

export default function EmployeeAttendancePage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [periodConfirmation, setPeriodConfirmation] =
    useState<AttendancePeriodConfirmation | null>(null);

  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth());
  const [loading, setLoading] = useState(true);
  const [submittingPeriod, setSubmittingPeriod] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CalendarDayRow | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rowDrafts, setRowDrafts] = useState<Record<string, RowDraft>>({});

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const periodRange = useMemo(() => getCutoffRange(periodMonth), [periodMonth]);

  const isPeriodLocked = Boolean(periodConfirmation?.is_locked);

  const submittedPeriod =
    periodConfirmation?.employee_status === "submitted" ||
    periodConfirmation?.supervisor_status === "pending" ||
    periodConfirmation?.supervisor_status === "approved" ||
    periodConfirmation?.hr_status === "ready_for_hr" ||
    periodConfirmation?.hr_status === "finalized";

  const isReadOnlyPeriod = submittedPeriod || isPeriodLocked;

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

  const presentCount = calendarRows.filter((item) => {
    return getDisplayStatus(item, getDraft(item)) === "present";
  }).length;

  const incompleteCount = calendarRows.filter((item) => {
    return isIncompleteRow(item, getDraft(item));
  }).length;

  const noRecordCount = calendarRows.filter((item) => {
    return !item.log && !isOffDayWithoutAttendance(item, getDraft(item));
  }).length;

  const phlCandidateCount = calendarRows.filter((item) => {
    return isPotentialPHL(item, getDraft(item));
  }).length;

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

    if (selectedRows.length === 0) {
      setErrorMessage("Pilih minimal 1 hari absensi sebelum submit ke atasan.");
      setSubmittingPeriod(false);
      return;
    }

    const validationErrors = selectedRows
      .map((row) => validateRowBeforeSubmit(row))
      .filter(Boolean);

    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors.join(" "));
      setSubmittingPeriod(false);
      return;
    }

    const batchId = crypto.randomUUID();
    const now = new Date().toISOString();

    for (const row of selectedRows) {
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

        hr_approval_status: "pending",
        hr_approved_by: null,
        hr_approved_at: null,
        hr_final_status: "waiting_supervisor",

        correction_notes: appendCorrectionNote(
          row.log?.correction_notes || null,
          `Employee submit absensi periode ${formatDisplayDate(periodRange.start)} s.d. ${formatDisplayDate(periodRange.end)} dengan keterangan: ${meta.label}.`,
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
          id: batchId,

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
          hr_status: "waiting_supervisor",

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

    setSuccessMessage(
      `Absensi periode ${formatDisplayDate(periodRange.start)} s.d. ${formatDisplayDate(periodRange.end)} berhasil dikirim ke atasan.`,
    );

    setSubmittingPeriod(false);
    await fetchData(false);
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
        period_locked: isPeriodLocked ? "YES" : "NO",
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
                value={periodConfirmation?.locked_by || "-"}
              />
              <LockInfo
                label="Tanggal lock"
                value={formatDateTime(periodConfirmation?.locked_at || "")}
              />
              <LockInfo
                label="Catatan HR"
                value={periodConfirmation?.lock_note || "-"}
              />
            </div>
          </div>
        )}

        {!isPeriodLocked && periodConfirmation?.unlocked_at && (
          <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-700">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <LockOpen size={18} />
              Lock periode sedang dibuka HR
            </div>

            <p>
              HR membuka lock periode ini untuk kebutuhan revisi. Jika revisi
              sudah selesai, periode dapat dikunci kembali oleh HR.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <LockInfo
                label="Dibuka oleh"
                value={periodConfirmation?.unlocked_by || "-"}
              />
              <LockInfo
                label="Tanggal unlock"
                value={formatDateTime(periodConfirmation?.unlocked_at || "")}
              />
              <LockInfo
                label="Catatan HR"
                value={periodConfirmation?.lock_note || "-"}
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
          <div className="flex flex-col gap-4 border-b border-black/5 p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Rekap Absensi Pribadi
              </h2>

              <p className="mt-1 text-sm text-[#6e6e73]">
                Periode {formatDisplayDate(periodRange.start)} s.d.{" "}
                {formatDisplayDate(periodRange.end)}.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PeriodStatusBadge period={periodConfirmation} />

                {isPeriodLocked ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    <Lock size={13} />
                    Locked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    <LockOpen size={13} />
                    Unlocked
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                type="month"
                value={periodMonth}
                onChange={(event) => setPeriodMonth(event.target.value)}
                className="harmony-input md:w-[190px]"
              />

              <button
                type="button"
                onClick={exportCsv}
                className="harmony-button-secondary"
              >
                <Download size={18} />
                Export
              </button>

              <button
                type="button"
                onClick={() => fetchData()}
                className="harmony-button-secondary"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
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
              <div className="grid gap-5 border-b border-black/5 p-6 xl:grid-cols-[0.75fr_1fr]">
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

                  <div className="mt-5 grid gap-3">
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
                      label="Status Lock"
                      value={isPeriodLocked ? "Locked by HR" : "Unlocked"}
                    />
                  </div>
                </div>

                <div className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-[#1d1d1f]">
                    Ringkasan Terakhir
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Klik tombol <strong>Lengkapi</strong> untuk menambahkan jam
                    manual, keterangan ketidakhadiran, jenis cuti, klaim PHL,
                    bukti, atau catatan lainnya.
                  </p>

                  {isPeriodLocked && (
                    <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                      Mode read-only aktif karena periode sudah dikunci HR.
                    </div>
                  )}

                  {latestLog ? (
                    <div className="mt-5 grid gap-4 md:grid-cols-4">
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
                    Centang hari yang sudah dicek. Hari kerja, Sabtu, Minggu,
                    libur nasional, dan libur perusahaan tetap bisa diberi
                    keterangan manual lewat tombol Lengkapi.
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#007aff]">
                    Dipilih: {selectedRows.length} dari {selectableRows.length}{" "}
                    hari yang perlu dikonfirmasi.
                  </p>

                  {isReadOnlyPeriod && (
                    <p className="mt-2 text-xs font-bold text-orange-700">
                      Tombol konfirmasi nonaktif karena periode sudah disubmit
                      atau dikunci.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
                      selectedRows.length === 0 ||
                      isReadOnlyPeriod ||
                      submittingPeriod
                    }
                    className="harmony-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={18} />
                    {submittingPeriod
                      ? "Mengirim..."
                      : "Submit Periode ke Atasan"}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 p-4 min-[2200px]:hidden">
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

                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f5f5f7]/80 p-3">
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

                          <button
                            type="button"
                            disabled={isReadOnlyPeriod || submittingPeriod}
                            onClick={() => openEdit(row)}
                            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PencilLine size={15} />
                            Lengkapi
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto min-[2200px]:block">
                <table className="w-full min-w-[1560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                      <th className="w-[5%] px-5 py-4 text-center font-semibold">
                        Cek
                      </th>
                      <th className="w-[10%] px-5 py-4 font-semibold">
                        Tanggal
                      </th>
                      <th className="w-[8%] px-5 py-4 font-semibold">Hari</th>
                      <th className="w-[9%] px-5 py-4 font-semibold">
                        Clock In
                      </th>
                      <th className="w-[9%] px-5 py-4 font-semibold">
                        Clock Out
                      </th>
                      <th className="w-[8%] px-5 py-4 font-semibold">Durasi</th>
                      <th className="w-[11%] px-5 py-4 font-semibold">
                        Status
                      </th>
                      <th className="w-[13%] px-5 py-4 font-semibold">
                        Keterangan
                      </th>
                      <th className="w-[12%] px-5 py-4 font-semibold">
                        Validasi
                      </th>
                      <th className="w-[8%] px-5 py-4 font-semibold">
                        Approval
                      </th>
                      <th className="w-[12%] px-5 py-4 text-center font-semibold">
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
                          <td className="px-5 py-4 text-center">
                            <AttendanceCheckButton
                              row={row}
                              draft={draft}
                              selected={isSelected}
                              disabled={isReadOnlyPeriod || submittingPeriod}
                              onClick={() => toggleAttendanceSelection(row)}
                            />
                          </td>

                          <td className="px-5 py-4 font-semibold text-[#1d1d1f]">
                            {formatDisplayDate(row.date)}

                            {row.holiday_name && (
                              <p className="mt-1 line-clamp-1 text-[11px] font-bold text-orange-700">
                                {row.holiday_name}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-[#6e6e73]">
                            {row.day_name}
                          </td>

                          <td className="px-5 py-4">
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

                          <td className="px-5 py-4">
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

                          <td className="px-5 py-4 text-[#1d1d1f]">
                            {formatDuration(row.log?.work_duration_minutes)}
                          </td>

                          <td className="px-5 py-4">
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

                          <td className="px-5 py-4">
                            <RequestLabelBadge row={row} draft={draft} />
                          </td>

                          <td className="px-5 py-4">
                            <ValidationInfo row={row} draft={draft} />
                          </td>

                          <td className="px-5 py-4">
                            <ApprovalBadge
                              status={
                                row.log?.supervisor_approval_status || "none"
                              }
                            />
                          </td>

                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              disabled={isReadOnlyPeriod || submittingPeriod}
                              onClick={() => openEdit(row)}
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-2xl bg-[#e8f2ff] px-4 text-xs font-bold text-[#0059b8] transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <PencilLine size={15} />
                              Lengkapi
                            </button>
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

        {editOpen && selectedRow && (
          <EditAttendanceModal
            row={selectedRow}
            draft={getDraft(selectedRow)}
            locked={isPeriodLocked}
            onChange={(field, value) =>
              updateRowDraft(selectedRow.date, field, value)
            }
            onClose={closeEdit}
          />
        )}
      </section>
    </>
  );
}

function EditAttendanceModal({
  row,
  draft,
  locked,
  onChange,
  onClose,
}: {
  row: CalendarDayRow;
  draft: RowDraft;
  locked: boolean;
  onChange: (field: keyof RowDraft, value: string | File | null) => void;
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
              <option value="present">Hadir Normal</option>
              <option value="manual_attendance">
                Hadir Manual / Koreksi Jam
              </option>

              <optgroup label="Cuti">
                <option value="annual_leave">Cuti Tahunan</option>
                <option value="marriage_leave">Cuti Menikah</option>
                <option value="maternity_leave">Cuti Melahirkan</option>
                <option value="miscarriage_leave">Cuti Keguguran</option>
                <option value="bereavement_leave">Cuti Duka</option>
                <option value="child_circumcision_leave">
                  Cuti Khitan / Baptis Anak
                </option>
                <option value="worship_leave">Cuti Ibadah</option>
                <option value="menstrual_leave">Cuti Haid</option>
                <option value="pregnancy_check_leave">
                  Pemeriksaan Kehamilan
                </option>
              </optgroup>

              <optgroup label="PHL">
                <option value="phl_claim">Klaim PHL</option>
              </optgroup>

              <optgroup label="Keterangan Lain">
                <option value="official_travel">Tugas Luar / Dinas</option>
                <option value="sick">Sakit</option>
                <option value="permit">Izin</option>
                <option value="absent">Alpa / Tidak Hadir</option>
              </optgroup>
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
            onClick={onClose}
            className="harmony-button-primary"
          >
            <Save size={18} />
            {locked ? "Tutup" : "Simpan Sementara"}
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
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/10 px-4 py-3">
      <span className="text-xs text-white/45">{label}</span>

      <span className="truncate text-sm font-semibold text-white">{value}</span>
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
  const type = row.log?.absence_request_type || row.log?.status || "";

  if (type === "annual_leave") return "annual_leave";
  if (type === "marriage_leave") return "marriage_leave";
  if (type === "maternity_leave") return "maternity_leave";
  if (type === "miscarriage_leave") return "miscarriage_leave";
  if (type === "bereavement_leave") return "bereavement_leave";
  if (type === "child_circumcision_leave") return "child_circumcision_leave";
  if (type === "worship_leave") return "worship_leave";
  if (type === "menstrual_leave") return "menstrual_leave";
  if (type === "pregnancy_check_leave") return "pregnancy_check_leave";
  if (type === "phl_claim") return "phl_claim";
  if (type === "sick") return "sick";
  if (type === "permit" || type === "permission") return "permit";
  if (type === "official_travel") return "official_travel";
  if (type === "absent" || type === "alpa") return "absent";
  if (row.log?.manual_check_in || row.log?.manual_check_out)
    return "manual_attendance";

  if (!row.log?.id && (row.is_weekend || row.holiday_name)) {
    return "present";
  }

  return row.log?.id ? "present" : "absent";
}

function isIncompleteRow(row: CalendarDayRow, draft?: RowDraft) {
  const hasAnyScan = Boolean(row.log?.check_in || row.log?.check_out);

  const hasManual = Boolean(
    draft?.manual_check_in ||
    draft?.manual_check_out ||
    row.log?.manual_check_in ||
    row.log?.manual_check_out,
  );

  const meta = draft ? getDailyTypeMeta(draft.daily_type) : null;

  if (meta?.isAbsenceLike) return false;

  const missingOneSide = !row.log?.check_in || !row.log?.check_out;

  return (hasAnyScan || hasManual) && missingOneSide;
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
  if (draft.manual_check_in || draft.manual_check_out) return "present";

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
  const map: Record<DailyType, DailyTypeMeta> = {
    present: {
      label: "Hadir Normal",
      status: "present",
      correctionType: "attendance_confirmation",
      absenceRequestType: null,
      absenceRequestLabel: null,
      requiresProof: false,
      requiresManualTime: false,
      isLeaveLike: false,
      isAbsenceLike: false,
      isPHLClaim: false,
    },
    manual_attendance: {
      label: "Hadir Manual / Koreksi Jam",
      status: "present",
      correctionType: "manual_check",
      absenceRequestType: "manual_attendance",
      absenceRequestLabel: "Hadir Manual / Koreksi Jam",
      requiresProof: true,
      requiresManualTime: true,
      isLeaveLike: false,
      isAbsenceLike: false,
      isPHLClaim: false,
    },
    annual_leave: {
      label: "Cuti Tahunan",
      status: "leave",
      correctionType: "annual_leave",
      absenceRequestType: "annual_leave",
      absenceRequestLabel: "Cuti Tahunan",
      requiresProof: false,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    marriage_leave: {
      label: "Cuti Menikah",
      status: "leave",
      correctionType: "marriage_leave",
      absenceRequestType: "marriage_leave",
      absenceRequestLabel: "Cuti Menikah",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    maternity_leave: {
      label: "Cuti Melahirkan",
      status: "leave",
      correctionType: "maternity_leave",
      absenceRequestType: "maternity_leave",
      absenceRequestLabel: "Cuti Melahirkan",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    miscarriage_leave: {
      label: "Cuti Keguguran",
      status: "leave",
      correctionType: "miscarriage_leave",
      absenceRequestType: "miscarriage_leave",
      absenceRequestLabel: "Cuti Keguguran",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    bereavement_leave: {
      label: "Cuti Duka",
      status: "leave",
      correctionType: "bereavement_leave",
      absenceRequestType: "bereavement_leave",
      absenceRequestLabel: "Cuti Duka",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    child_circumcision_leave: {
      label: "Cuti Khitan / Baptis Anak",
      status: "leave",
      correctionType: "child_circumcision_leave",
      absenceRequestType: "child_circumcision_leave",
      absenceRequestLabel: "Cuti Khitan / Baptis Anak",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    worship_leave: {
      label: "Cuti Ibadah",
      status: "leave",
      correctionType: "worship_leave",
      absenceRequestType: "worship_leave",
      absenceRequestLabel: "Cuti Ibadah",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    menstrual_leave: {
      label: "Cuti Haid",
      status: "leave",
      correctionType: "menstrual_leave",
      absenceRequestType: "menstrual_leave",
      absenceRequestLabel: "Cuti Haid",
      requiresProof: false,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    pregnancy_check_leave: {
      label: "Pemeriksaan Kehamilan",
      status: "leave",
      correctionType: "pregnancy_check_leave",
      absenceRequestType: "pregnancy_check_leave",
      absenceRequestLabel: "Pemeriksaan Kehamilan",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: true,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    phl_claim: {
      label: "Klaim PHL",
      status: "phl_claim",
      correctionType: "phl_claim",
      absenceRequestType: "phl_claim",
      absenceRequestLabel: "Klaim PHL",
      requiresProof: false,
      requiresManualTime: false,
      isLeaveLike: false,
      isAbsenceLike: true,
      isPHLClaim: true,
    },
    official_travel: {
      label: "Tugas Luar / Dinas",
      status: "official_travel",
      correctionType: "official_travel",
      absenceRequestType: "official_travel",
      absenceRequestLabel: "Tugas Luar / Dinas",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: false,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    sick: {
      label: "Sakit",
      status: "sick",
      correctionType: "sick",
      absenceRequestType: "sick",
      absenceRequestLabel: "Sakit",
      requiresProof: true,
      requiresManualTime: false,
      isLeaveLike: false,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    permit: {
      label: "Izin",
      status: "permit",
      correctionType: "permit",
      absenceRequestType: "permit",
      absenceRequestLabel: "Izin",
      requiresProof: false,
      requiresManualTime: false,
      isLeaveLike: false,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
    absent: {
      label: "Alpa / Tidak Hadir",
      status: "absent",
      correctionType: "absent",
      absenceRequestType: "absent",
      absenceRequestLabel: "Alpa / Tidak Hadir",
      requiresProof: false,
      requiresManualTime: false,
      isLeaveLike: false,
      isAbsenceLike: true,
      isPHLClaim: false,
    },
  };

  return map[type];
}

function getDailyTypeDescription(type: DailyType) {
  if (type === "phl_claim") {
    return "Klaim PHL artinya karyawan menggunakan saldo PHL yang sudah pernah didapat dari bekerja pada weekend/libur.";
  }

  if (type === "manual_attendance") {
    return "Digunakan jika data mesin tidak lengkap atau tidak ada, namun karyawan benar-benar hadir dan perlu mengisi jam manual.";
  }

  if (type === "annual_leave") {
    return "Digunakan jika karyawan mengambil cuti tahunan.";
  }

  if (
    type === "marriage_leave" ||
    type === "maternity_leave" ||
    type === "miscarriage_leave" ||
    type === "bereavement_leave" ||
    type === "child_circumcision_leave" ||
    type === "worship_leave" ||
    type === "menstrual_leave" ||
    type === "pregnancy_check_leave"
  ) {
    return "Digunakan untuk cuti khusus. Beberapa jenis cuti membutuhkan bukti/dokumen pendukung.";
  }

  if (type === "official_travel") {
    return "Digunakan jika karyawan sedang tugas luar/dinas sehingga tidak memungkinkan scan fingerprint.";
  }

  if (type === "sick") {
    return "Digunakan jika karyawan sakit. Surat keterangan dokter atau bukti pendukung wajib dilampirkan.";
  }

  if (type === "permit") {
    return "Digunakan untuk izin tidak masuk kerja sesuai persetujuan atasan.";
  }

  if (type === "absent") {
    return "Digunakan jika karyawan tidak hadir tanpa keterangan khusus.";
  }

  return "Digunakan untuk konfirmasi kehadiran normal.";
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

function getCurrentPeriodMonth() {
  const today = new Date();
  const day = today.getDate();

  const period = new Date(today);

  if (day <= 10) {
    period.setMonth(period.getMonth() - 1);
  }

  return `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, "0")}`;
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

function formatDuration(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${hours}j ${minutes}m`;
}
