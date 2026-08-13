"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Timer,
  Undo2,
  UserCheck,
  UserRound,
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

type Employee = {
  id: string;
  employee_number: string | null;
  machine_pin: string | null;
  full_name: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  is_active: boolean | null;
};

type PeriodConfirmation = {
  id: string;
  employee_id: string;
  employee_number: string | null;
  machine_pin: string | null;
  full_name: string | null;
  department: string | null;
  position: string | null;

  period_month: string;
  period_start: string;
  period_end: string;

  employee_status: string | null;
  employee_submitted_at: string | null;

  supervisor_status: string | null;
  supervisor_name: string | null;
  supervisor_approved_at: string | null;
  supervisor_rejected_at: string | null;
  supervisor_note: string | null;

  hr_status: string | null;
  hr_finalized_at: string | null;
  hr_finalized_by: string | null;
  hr_note: string | null;

  is_locked: boolean | null;
  locked_at: string | null;
  locked_by: string | null;
  locked_by_name: string | null;
};

type AttendanceLog = {
  id: string;
  employee_id: string | null;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  manual_check_in: string | null;
  manual_check_out: string | null;
  status: string | null;

  employee_confirmation_status: string | null;
  employee_daily_note: string | null;

  supervisor_approval_status: string | null;
  supervisor_approved_by: string | null;
  supervisor_approved_at: string | null;
  supervisor_note: string | null;

  hr_approval_status: string | null;
  hr_approved_by: string | null;
  hr_approved_at: string | null;
  hr_note: string | null;
  hr_final_status: string | null;

  absence_request_type: string | null;
  absence_request_label: string | null;
  absence_request_status: string | null;

  is_phl_candidate: boolean | null;
  phl_proof_url: string | null;
  phl_proof_name: string | null;
  absence_proof_url: string | null;
  absence_proof_name: string | null;

  is_locked: boolean | null;
  deleted_at: string | null;
};

type HRIdentity = {
  userId: string;
  email: string;
  name: string;
  role: string;
};

export default function HRAttendanceSafeReviewPage() {
  const params = useParams();

  const employeeId = getParam(params, "employeeId");
  const periodMonth = normalizePeriodMonth(getParam(params, "period"));

  const [identity, setIdentity] = useState<HRIdentity | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [confirmation, setConfirmation] =
    useState<PeriodConfirmation | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reviewNote, setReviewNote] = useState(
    "Data absensi telah direview dan disetujui HR.",
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fallbackRange = useMemo(
    () => getCutoffRange(periodMonth),
    [periodMonth],
  );

  const periodStart =
    confirmation?.period_start || fallbackRange.start;
  const periodEnd =
    confirmation?.period_end || fallbackRange.end;

  const hrApproved =
    logs.length > 0 &&
    logs.every(
      (log) => normalize(log.hr_approval_status) === "approved",
    );

  const finalized =
    normalize(confirmation?.hr_status) === "finalized" ||
    logs.some((log) => normalize(log.hr_final_status) === "finalized");

  const locked =
    Boolean(confirmation?.is_locked) ||
    logs.some((log) => Boolean(log.is_locked));

  const supervisorApproved =
    normalize(confirmation?.supervisor_status) === "approved";

  const readyForHR =
    normalize(confirmation?.hr_status) === "ready_for_hr";

  const canApprove =
    Boolean(identity) &&
    Boolean(confirmation) &&
    logs.length > 0 &&
    supervisorApproved &&
    readyForHR &&
    !finalized &&
    !locked &&
    !hrApproved;

  const canRevoke =
    Boolean(identity) &&
    Boolean(confirmation) &&
    logs.length > 0 &&
    hrApproved &&
    readyForHR &&
    !finalized &&
    !locked;

  const metrics = useMemo(() => {
    const present = logs.filter((log) =>
      ["present", "hadir", "late", "incomplete"].includes(
        normalize(log.status),
      ),
    ).length;

    const leave = logs.filter((log) =>
      [
        "leave",
        "annual_leave",
        "marriage_leave",
        "maternity_leave",
        "miscarriage_leave",
        "bereavement_leave",
        "worship_leave",
        "menstrual_leave",
        "pregnancy_check_leave",
      ].includes(normalize(log.status)),
    ).length;

    const absence = logs.filter((log) =>
      ["absent", "alpa", "alpha", "sick", "permit"].includes(
        normalize(log.status),
      ),
    ).length;

    const phl = logs.filter(
      (log) =>
        Boolean(log.is_phl_candidate) ||
        normalize(log.status).includes("phl"),
    ).length;

    return {
      total: logs.length,
      present,
      leave,
      absence,
      phl,
    };
  }, [logs]);

  useEffect(() => {
    fetchData();
  }, [employeeId, periodMonth]);

  async function fetchData() {
    setLoading(true);
    setErrorMessage("");

    try {
      if (!employeeId || !isValidPeriodMonth(periodMonth)) {
        throw new Error(
          "Parameter route tidak valid. Format route harus /hr/attendance/approvals/[employeeId]/[YYYY-MM].",
        );
      }

      const currentIdentity = await getHRIdentity();

      if (!currentIdentity) {
        throw new Error(
          "Akses ditolak. Route ini hanya dapat digunakan oleh HR/Admin aktif.",
        );
      }

      setIdentity(currentIdentity);

      const { data: employeeData, error: employeeError } =
        await supabase
          .from("employees")
          .select("*")
          .eq("id", employeeId)
          .maybeSingle<Employee>();

      if (employeeError) throw employeeError;
      if (!employeeData) {
        throw new Error("Data karyawan tidak ditemukan.");
      }

      setEmployee(employeeData);

      const { data: confirmationData, error: confirmationError } =
        await supabase
          .from("attendance_period_confirmations")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("period_month", periodMonth)
          .maybeSingle<PeriodConfirmation>();

      if (confirmationError) throw confirmationError;
      if (!confirmationData) {
        throw new Error(
          "Konfirmasi periode karyawan belum tersedia.",
        );
      }

      setConfirmation(confirmationData);

      const start =
        confirmationData.period_start || fallbackRange.start;
      const end =
        confirmationData.period_end || fallbackRange.end;

      const { data: logData, error: logError } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .gte("attendance_date", start)
        .lte("attendance_date", end)
        .order("attendance_date", { ascending: true });

      if (logError) throw logError;

      setLogs((logData || []) as AttendanceLog[]);
    } catch (error: any) {
      setEmployee(null);
      setConfirmation(null);
      setLogs([]);
      setErrorMessage(
        error?.message || "Data HR Review gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function approveHR() {
    if (!identity || !confirmation || !employee) {
      setErrorMessage("Data HR atau periode belum tersedia.");
      return;
    }

    if (!supervisorApproved) {
      setErrorMessage(
        "Approve HR hanya dapat dilakukan setelah atasan menyetujui periode.",
      );
      return;
    }

    if (!readyForHR) {
      setErrorMessage(
        "Status periode harus Ready for HR.",
      );
      return;
    }

    if (locked || finalized) {
      setErrorMessage(
        "Periode sudah locked/finalized dan tidak dapat diubah.",
      );
      return;
    }

    if (logs.length === 0) {
      setErrorMessage(
        "Tidak ada attendance_logs pada periode ini.",
      );
      return;
    }

    const note =
      reviewNote.trim() ||
      "Data absensi telah direview dan disetujui HR.";

    const confirmed = window.confirm(
      [
        `Approve HR untuk ${employee.full_name || employee.employee_number || "karyawan"}?`,
        "",
        "Approve HR tidak akan melakukan Finalisasi atau Lock.",
        "Finalisasi dilakukan terpisah setelah review selesai.",
      ].join("\n"),
    );

    if (!confirmed) return;

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const now = new Date().toISOString();

      const { data: updatedLogs, error: logError } =
        await supabase
          .from("attendance_logs")
          .update({
            hr_approval_status: "approved",
            hr_approved_by: identity.name,
            hr_approved_at: now,
            hr_note: note,
            hr_final_status: "ready_for_hr",
            updated_at: now,
          })
          .eq("employee_id", employeeId)
          .is("deleted_at", null)
          .gte("attendance_date", periodStart)
          .lte("attendance_date", periodEnd)
          .select("id");

      if (logError) throw logError;

      const { error: headerError } = await supabase
        .from("attendance_period_confirmations")
        .update({
          // Tetap ready_for_hr untuk menjaga kompatibilitas
          // dengan Final Report existing.
          hr_status: "ready_for_hr",
          hr_note: `[HR APPROVED ${formatDateTime(now)}] ${note}`,
          updated_at: now,
        })
        .eq("id", confirmation.id);

      if (headerError) throw headerError;

      await writeAudit({
        identity,
        actionType: "hr_approve_employee_period",
        actionLabel: "Approve HR Per Karyawan",
        totalAffected: updatedLogs?.length || 0,
        note,
        periodMonth,
        periodStart,
        periodEnd,
        metadata: {
          employee_id: employeeId,
          employee_number: employee.employee_number,
          compatibility_header_status: "ready_for_hr",
          finalization_done: false,
        },
      });

      setSuccessMessage(
        `Approval HR berhasil. ${updatedLogs?.length || 0} log menjadi HR Approved. Data belum difinalisasi dan belum dikunci.`,
      );

      await fetchData();
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Approval HR gagal diproses.",
      );
    } finally {
      setProcessing(false);
    }
  }

  async function revokeHRApproval() {
    if (!identity || !confirmation || !employee) return;

    if (!canRevoke) {
      setErrorMessage(
        "Approval HR tidak dapat dibatalkan pada status saat ini.",
      );
      return;
    }

    const reason = window.prompt(
      "Alasan membatalkan Approval HR:",
      "HR perlu melakukan review ulang sebelum finalisasi.",
    );

    if (reason === null) return;

    if (reason.trim().length < 5) {
      setErrorMessage("Alasan minimal 5 karakter.");
      return;
    }

    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const now = new Date().toISOString();

      const { data: updatedLogs, error: logError } =
        await supabase
          .from("attendance_logs")
          .update({
            hr_approval_status: "pending",
            hr_approved_by: null,
            hr_approved_at: null,
            hr_note: `[HR APPROVAL REVOKED ${formatDateTime(now)}] ${reason.trim()}`,
            hr_final_status: "ready_for_hr",
            updated_at: now,
          })
          .eq("employee_id", employeeId)
          .is("deleted_at", null)
          .gte("attendance_date", periodStart)
          .lte("attendance_date", periodEnd)
          .select("id");

      if (logError) throw logError;

      const { error: headerError } = await supabase
        .from("attendance_period_confirmations")
        .update({
          hr_status: "ready_for_hr",
          hr_note: `[HR APPROVAL REVOKED ${formatDateTime(now)}] ${reason.trim()}`,
          updated_at: now,
        })
        .eq("id", confirmation.id);

      if (headerError) throw headerError;

      await writeAudit({
        identity,
        actionType: "hr_revoke_employee_period_approval",
        actionLabel: "Batalkan Approval HR",
        totalAffected: updatedLogs?.length || 0,
        note: reason.trim(),
        periodMonth,
        periodStart,
        periodEnd,
        metadata: {
          employee_id: employeeId,
          employee_number: employee.employee_number,
          finalization_done: false,
        },
      });

      setSuccessMessage(
        "Approval HR berhasil dibatalkan. Periode harus direview kembali sebelum Finalisasi.",
      );

      await fetchData();
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Pembatalan Approval HR gagal.",
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <Topbar
        title="HR Review Absensi"
        description="Review HR setelah approval atasan dan sebelum Finalisasi/Lock."
      />

      <section className="space-y-5 p-4 sm:p-5 xl:p-6">
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

        <div className="relative overflow-hidden rounded-[32px] border border-black/5 bg-[#1d1d1f] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:p-6">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <Link
                href="/hr/attendance/data"
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 transition hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Data Absensi
              </Link>

              <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                Safe HR Approval Route
              </div>

              <h1 className="break-words text-2xl font-semibold tracking-[-0.04em] sm:text-3xl xl:text-4xl">
                {employee?.full_name || "HR Review Absensi"}
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                Periode {formatDisplayDate(periodStart)} -{" "}
                {formatDisplayDate(periodEnd)}. Approval di halaman ini
                tidak melakukan Finalisasi dan tidak melakukan Lock.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[620px]">
              <HeroMetric label="Log" value={String(metrics.total)} />
              <HeroMetric label="Hadir" value={String(metrics.present)} />
              <HeroMetric
                label="Keterangan"
                value={String(metrics.leave + metrics.absence)}
              />
              <HeroMetric
                label="HR"
                value={
                  finalized
                    ? "Final"
                    : hrApproved
                      ? "Approved"
                      : "Review"
                }
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="harmony-card flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
            <Loader2 size={18} className="animate-spin" />
            Memuat detail HR Review...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                label="Karyawan"
                value={employee?.full_name || "-"}
                icon={<UserRound size={18} />}
              />
              <InfoCard
                label="NIP / Machine"
                value={
                  employee?.employee_number ||
                  employee?.machine_pin ||
                  "-"
                }
                icon={<UserCheck size={18} />}
              />
              <InfoCard
                label="Approval Atasan"
                value={formatStatus(confirmation?.supervisor_status)}
                icon={<CheckCircle2 size={18} />}
              />
              <InfoCard
                label="Proses HR"
                value={
                  finalized
                    ? "Finalized"
                    : hrApproved
                      ? "HR Approved"
                      : formatStatus(confirmation?.hr_status)
                }
                icon={finalized ? <Lock size={18} /> : <ShieldCheck size={18} />}
              />
            </div>

            {!supervisorApproved && (
              <div className="rounded-[26px] border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-700">
                HR Review belum dapat diproses karena periode belum
                <strong> Approved</strong> oleh atasan.
              </div>
            )}

            {hrApproved && !finalized && (
              <div className="rounded-[26px] border border-green-200 bg-green-50 p-5 text-sm leading-6 text-green-700">
                <div className="font-bold">HR Review selesai.</div>
                Data sudah <strong>HR Approved</strong>, tetapi belum
                difinalisasi dan belum dikunci.
              </div>
            )}

            {finalized && (
              <div className="rounded-[26px] border border-slate-200 bg-slate-100 p-5 text-sm leading-6 text-slate-700">
                Periode sudah Finalized. HR Review menjadi read-only.
              </div>
            )}

            <div className="harmony-card overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">
                    Review Data Harian
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Periksa jam, status, keterangan, approval atasan, dan
                    bukti sebelum Approve HR.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading || processing}
                  className="harmony-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw size={17} />
                  Refresh
                </button>
              </div>

              <div className="grid gap-3 p-4 2xl:hidden">
                {logs.map((log) => (
                  <MobileLogCard key={log.id} log={log} />
                ))}
              </div>

              <div className="hidden overflow-x-auto 2xl:block">
                <table className="min-w-[1180px] w-full table-fixed border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                      <th className="w-[120px] px-4 py-3">Tanggal</th>
                      <th className="w-[90px] px-4 py-3">Masuk</th>
                      <th className="w-[90px] px-4 py-3">Pulang</th>
                      <th className="w-[130px] px-4 py-3">Status</th>
                      <th className="w-[170px] px-4 py-3">Keterangan</th>
                      <th className="w-[140px] px-4 py-3">Atasan</th>
                      <th className="w-[140px] px-4 py-3">HR</th>
                      <th className="w-[170px] px-4 py-3">Bukti</th>
                    </tr>
                  </thead>

                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-black/5 hover:bg-[#f8f8fa]"
                      >
                        <td className="px-4 py-4 font-bold text-[#1d1d1f]">
                          {formatDisplayDate(log.attendance_date)}
                        </td>
                        <td className="px-4 py-4">
                          <TimeValue
                            value={log.check_in || log.manual_check_in || "-"}
                            manual={Boolean(log.manual_check_in)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <TimeValue
                            value={log.check_out || log.manual_check_out || "-"}
                            manual={Boolean(log.manual_check_out)}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill value={log.status || "-"} />
                        </td>
                        <td className="px-4 py-4 text-[#6e6e73]">
                          {log.absence_request_label ||
                            log.employee_daily_note ||
                            "-"}
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill
                            value={log.supervisor_approval_status || "-"}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill
                            value={
                              normalize(log.hr_approval_status) === "approved"
                                ? "HR Approved"
                                : log.hr_approval_status || "Pending HR"
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <ProofLinks log={log} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="harmony-card p-5 sm:p-6">
              <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
                <label className="block">
                  <span className="harmony-label">Catatan Review HR</span>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    disabled={finalized || locked || processing}
                    placeholder="Catatan hasil review HR..."
                    className="harmony-textarea disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
                  {canRevoke && (
                    <button
                      type="button"
                      onClick={revokeHRApproval}
                      disabled={processing}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
                    >
                      <Undo2 size={18} />
                      Batalkan Approval HR
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={approveHR}
                    disabled={!canApprove || processing}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <UserCheck size={18} />
                    )}
                    {hrApproved ? "HR Approved" : "Approve HR"}
                  </button>

                  {hrApproved && !finalized && (
                    <Link
                      href="/hr/attendance/final-report"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-6 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <ShieldCheck size={18} />
                      Lanjut Final Report
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-700">
                <strong>Safe flow:</strong> Approve HR hanya mengisi
                <code className="mx-1 rounded bg-white px-1 py-0.5">
                  hr_approval_status
                </code>
                dan metadata approval. Header tetap
                <code className="mx-1 rounded bg-white px-1 py-0.5">
                  ready_for_hr
                </code>
                supaya kompatibel dengan Final Report existing. Lock hanya
                terjadi saat Finalisasi.
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function MobileLogCard({ log }: { log: AttendanceLog }) {
  return (
    <div className="rounded-[24px] border border-black/5 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-[#1d1d1f]">
            {formatDisplayDate(log.attendance_date)}
          </p>
          <div className="mt-2">
            <StatusPill value={log.status || "-"} />
          </div>
        </div>

        <StatusPill
          value={
            normalize(log.hr_approval_status) === "approved"
              ? "HR Approved"
              : log.hr_approval_status || "Pending HR"
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniInfo
          label="Clock In"
          value={log.check_in || log.manual_check_in || "-"}
        />
        <MiniInfo
          label="Clock Out"
          value={log.check_out || log.manual_check_out || "-"}
        />
        <MiniInfo
          label="Atasan"
          value={formatStatus(log.supervisor_approval_status)}
        />
        <MiniInfo
          label="Keterangan"
          value={
            log.absence_request_label ||
            log.employee_daily_note ||
            "-"
          }
        />
      </div>

      <div className="mt-4">
        <ProofLinks log={log} />
      </div>
    </div>
  );
}

function ProofLinks({ log }: { log: AttendanceLog }) {
  const links = [
    log.absence_proof_url
      ? {
          label: log.absence_proof_name || "Bukti Ketidakhadiran",
          url: log.absence_proof_url,
        }
      : null,
    log.phl_proof_url
      ? {
          label: log.phl_proof_name || "Bukti PHL",
          url: log.phl_proof_url,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; url: string }>;

  if (links.length === 0) {
    return <span className="text-xs text-[#86868b]">-</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {links.map((item) => (
        <a
          key={`${item.url}-${item.label}`}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#007aff]"
        >
          <FileText size={14} />
          <span className="max-w-[150px] truncate">{item.label}</span>
          <ExternalLink size={12} />
        </a>
      ))}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="harmony-card p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#e8f2ff] p-2.5 text-[#007aff]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#86868b]">{label}</p>
          <p className="mt-1 break-words text-sm font-bold text-[#1d1d1f]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/10 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-semibold leading-5 text-[#1d1d1f]">
        {value}
      </p>
    </div>
  );
}

function TimeValue({
  value,
  manual,
}: {
  value: string;
  manual: boolean;
}) {
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
        <p className="mt-1 text-[10px] font-bold text-[#007aff]">Manual</p>
      )}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = normalize(value);

  const className =
    normalized.includes("approved") ||
    normalized === "present" ||
    normalized === "hadir"
      ? "border-green-200 bg-green-50 text-green-700"
      : normalized.includes("reject") ||
          normalized.includes("absent") ||
          normalized.includes("alpa")
        ? "border-red-200 bg-red-50 text-red-700"
        : normalized.includes("pending") ||
            normalized.includes("ready") ||
            normalized.includes("waiting")
          ? "border-orange-200 bg-orange-50 text-orange-700"
          : "border-black/5 bg-[#f5f5f7] text-[#6e6e73]";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${className}`}
    >
      {formatStatus(value)}
    </span>
  );
}

async function getHRIdentity(): Promise<HRIdentity | null> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) return null;

  let appUser: AppUser | null = null;

  const byId = await supabase
    .from("app_users")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle<AppUser>();

  if (!byId.error && byId.data) {
    appUser = byId.data;
  } else if (authData.user.email) {
    const byEmail = await supabase
      .from("app_users")
      .select("*")
      .eq("email", authData.user.email.toLowerCase())
      .maybeSingle<AppUser>();

    if (!byEmail.error) {
      appUser = byEmail.data || null;
    }
  }

  if (!appUser || appUser.is_active === false) return null;

  const role = normalize(appUser.role);
  const allowedRoles = new Set([
    "hr",
    "admin",
    "administrator",
    "master",
    "super_admin",
    "superadmin",
  ]);

  if (!allowedRoles.has(role)) return null;

  let displayName =
    authData.user.email || appUser.email || "HR";

  if (appUser.employee_id) {
    const { data: employeeData } = await supabase
      .from("employees")
      .select("full_name")
      .eq("id", appUser.employee_id)
      .maybeSingle<{ full_name: string | null }>();

    if (employeeData?.full_name) {
      displayName = employeeData.full_name;
    }
  }

  return {
    userId: authData.user.id,
    email: authData.user.email || appUser.email,
    name: displayName,
    role: appUser.role,
  };
}

async function writeAudit({
  identity,
  actionType,
  actionLabel,
  totalAffected,
  note,
  periodMonth,
  periodStart,
  periodEnd,
  metadata,
}: {
  identity: HRIdentity;
  actionType: string;
  actionLabel: string;
  totalAffected: number;
  note: string;
  periodMonth: string;
  periodStart: string;
  periodEnd: string;
  metadata: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from("attendance_audit_logs")
    .insert({
      action_type: actionType,
      action_label: actionLabel,
      period_month: periodMonth,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      actor_id: identity.userId,
      actor_name: identity.name,
      actor_role: "hr",
      total_affected: totalAffected,
      note,
      metadata,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.warn("HR attendance audit warning:", error.message);
  }
}

function getParam(
  params: ReturnType<typeof useParams>,
  key: string,
) {
  const value = params?.[key];

  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}

function normalizePeriodMonth(value: string) {
  const decoded = decodeURIComponent(String(value || ""));
  const match = decoded.match(/^(\d{4})-(\d{2})$/);

  if (!match) return decoded;

  return `${match[1]}-${match[2]}`;
}

function isValidPeriodMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function getCutoffRange(periodMonth: string) {
  if (!isValidPeriodMonth(periodMonth)) {
    return { start: "", end: "" };
  }

  const [yearText, monthText] = periodMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return {
    start: toISODate(new Date(year, month - 1, 11)),
    end: toISODate(new Date(year, month, 10)),
  };
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  if (!value) return "-";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

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

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function formatStatus(value: unknown) {
  const text = String(value || "").trim();
  const status = normalize(value);

  if (!text) return "-";
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  if (status === "ready_for_hr") return "Ready for HR";
  if (status === "waiting_supervisor") return "Menunggu Atasan";
  if (status === "finalized") return "Finalized";
  if (status === "hr_approved") return "HR Approved";
  if (status === "present") return "Present";
  if (status === "leave") return "Cuti";
  if (status === "sick") return "Sakit";
  if (status === "permit") return "Izin";
  if (status === "absent" || status === "alpa") return "Alpa";
  if (status === "official_travel") return "Tugas Luar";

  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}