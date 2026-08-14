"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
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

type ReviewRow = {
  confirmation: PeriodConfirmation;
  employee: Employee | null;
};

export default function HRAttendanceApprovalQueuePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchQueue();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return rows;

    return rows.filter(({ confirmation, employee }) =>
      [
        employee?.full_name,
        employee?.employee_number,
        employee?.machine_pin,
        employee?.department,
        employee?.position,
        confirmation.full_name,
        confirmation.employee_number,
        confirmation.department,
        confirmation.position,
        confirmation.period_month,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [rows, search]);

  const readyCount = rows.filter(
    ({ confirmation }) =>
      normalize(confirmation.supervisor_status) === "approved" &&
      normalize(confirmation.hr_status) === "ready_for_hr" &&
      !confirmation.is_locked,
  ).length;

  const reviewedCount = rows.filter(
    ({ confirmation }) =>
      normalize(confirmation.supervisor_status) === "approved" &&
      normalize(confirmation.hr_status) === "ready_for_hr" &&
      Boolean(confirmation.hr_note),
  ).length;

  const lockedCount = rows.filter(({ confirmation }) =>
    Boolean(confirmation.is_locked),
  ).length;

  async function fetchQueue(fromRefresh = false) {
    if (fromRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage("");

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Session HR tidak ditemukan. Silakan login ulang.");
      }

      let appUser: AppUser | null = null;

      const byId = await supabase
        .from("app_users")
        .select("id, email, role, employee_id, is_active")
        .eq("id", authData.user.id)
        .maybeSingle<AppUser>();

      if (!byId.error && byId.data) {
        appUser = byId.data;
      } else if (authData.user.email) {
        const byEmail = await supabase
          .from("app_users")
          .select("id, email, role, employee_id, is_active")
          .ilike("email", authData.user.email)
          .maybeSingle<AppUser>();

        if (!byEmail.error) appUser = byEmail.data;
      }

      const role = normalize(appUser?.role);

      if (
        !appUser ||
        appUser.is_active === false ||
        !["hr", "admin", "administrator", "super_admin"].includes(role)
      ) {
        throw new Error("Akses ditolak. Halaman ini hanya untuk HR/Admin aktif.");
      }

      const { data: confirmationData, error: confirmationError } = await supabase
        .from("attendance_period_confirmations")
        .select("*")
        .in("supervisor_status", ["approved"])
        .in("hr_status", ["ready_for_hr", "finalized"])
        .order("period_month", { ascending: false })
        .order("full_name", { ascending: true });

      if (confirmationError) throw confirmationError;

      const confirmations = (confirmationData || []) as PeriodConfirmation[];
      const employeeIds = Array.from(
        new Set(confirmations.map((item) => item.employee_id).filter(Boolean)),
      );

      let employees: Employee[] = [];

      if (employeeIds.length > 0) {
        const { data: employeeData, error: employeeError } = await supabase
          .from("employees")
          .select(
            "id, employee_number, machine_pin, full_name, department, position, email, is_active",
          )
          .in("id", employeeIds);

        if (employeeError) throw employeeError;
        employees = (employeeData || []) as Employee[];
      }

      const employeeMap = new Map(employees.map((item) => [item.id, item]));

      setRows(
        confirmations.map((confirmation) => ({
          confirmation,
          employee: employeeMap.get(confirmation.employee_id) || null,
        })),
      );
    } catch (error: any) {
      setRows([]);
      setErrorMessage(
        error?.message || "Queue HR Review belum berhasil dimuat.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <>
      <Topbar
        title="HR Review Absensi"
        description="Daftar periode yang sudah disetujui atasan dan siap direview HR sebelum Finalisasi/Lock."
      />

      <section className="space-y-5 p-4 sm:p-5 xl:p-6">
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
              <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                Safe HR Approval Queue
              </div>

              <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl xl:text-4xl">
                HR Review Absensi
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">
                Pilih karyawan dan periode dari daftar ini. Halaman detail HR
                Review hanya dapat dibuka dengan employee ID dan periode yang
                valid, sehingga route kosong tidak lagi menampilkan error
                parameter.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
              <HeroMetric label="Ready for HR" value={String(readyCount)} />
              <HeroMetric label="Sudah Direview" value={String(reviewedCount)} />
              <HeroMetric label="Locked" value={String(lockedCount)} />
            </div>
          </div>
        </div>

        <div className="harmony-card overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1d1d1f]">
                Queue HR Review
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                Menampilkan periode yang sudah Approved oleh atasan dan masuk
                proses HR.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 sm:w-72">
                <Search size={16} className="text-[#86868b]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari karyawan / periode..."
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchQueue(true)}
                disabled={refreshing}
                className="harmony-button-secondary disabled:opacity-50"
              >
                <RefreshCcw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center gap-3 rounded-2xl bg-[#f5f5f7] p-5 text-sm text-[#6e6e73]">
                <Loader2 size={18} className="animate-spin" />
                Memuat queue HR Review...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
                <CheckCircle2 size={26} className="mx-auto text-green-600" />
                <p className="mt-3 font-bold text-[#1d1d1f]">
                  Tidak ada queue HR Review
                </p>
                <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                  Periode akan muncul setelah employee submit dan atasan
                  memberikan approval.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRows.map(({ confirmation, employee }) => {
                  const employeeId = confirmation.employee_id;
                  const periodMonth = normalizePeriodMonth(
                    confirmation.period_month,
                  );
                  const canOpen =
                    Boolean(employeeId) && isValidPeriodMonth(periodMonth);

                  return (
                    <article
                      key={confirmation.id}
                      className="rounded-[24px] border border-black/5 bg-white p-5 shadow-sm"
                    >
                      <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              label={formatStatus(confirmation.supervisor_status)}
                              tone="green"
                            />
                            <StatusBadge
                              label={formatHRStatus(confirmation)}
                              tone={confirmation.is_locked ? "red" : "blue"}
                            />
                            <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-bold text-[#6e6e73]">
                              {periodMonth || "Periode tidak valid"}
                            </span>
                          </div>

                          <div className="mt-4 flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                              <UserRound size={19} />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-[#1d1d1f]">
                                {employee?.full_name ||
                                  confirmation.full_name ||
                                  "Karyawan"}
                              </h3>
                              <p className="mt-1 text-xs leading-5 text-[#6e6e73]">
                                {employee?.employee_number ||
                                  confirmation.employee_number ||
                                  employee?.machine_pin ||
                                  confirmation.machine_pin ||
                                  "-"}{" "}
                                ·{" "}
                                {employee?.department ||
                                  confirmation.department ||
                                  "-"}{" "}
                                · {employee?.position || confirmation.position || "-"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <InfoBox
                              label="Periode"
                              value={`${formatDate(confirmation.period_start)} - ${formatDate(confirmation.period_end)}`}
                            />
                            <InfoBox
                              label="Approval Atasan"
                              value={formatDateTime(
                                confirmation.supervisor_approved_at,
                              )}
                            />
                            <InfoBox
                              label="Atasan"
                              value={confirmation.supervisor_name || "-"}
                            />
                            <InfoBox
                              label="Proses HR"
                              value={formatHRStatus(confirmation)}
                            />
                          </div>
                        </div>

                        <div className="xl:min-w-[180px]">
                          {canOpen ? (
                            <Link
                              href={`/hr/attendance/approvals/${encodeURIComponent(
                                employeeId,
                              )}/${encodeURIComponent(periodMonth)}`}
                              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 text-sm font-bold text-white transition hover:bg-black"
                            >
                              <UserCheck size={17} />
                              Buka HR Review
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#f5f5f7] px-5 text-sm font-bold text-[#86868b]"
                            >
                              <AlertTriangle size={17} />
                              Route Tidak Valid
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "blue" | "red";
}) {
  const className = {
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
  }[tone];

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold text-[#1d1d1f]">{value}</p>
    </div>
  );
}

function normalize(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePeriodMonth(value: string) {
  const decoded = safeDecodeURIComponent(String(value || ""));
  const match = decoded.match(/^(\d{4})-(\d{2})$/);

  if (!match) return decoded;
  return `${match[1]}-${match[2]}`;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isValidPeriodMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function formatStatus(value: string | null) {
  const key = normalize(value);

  if (key === "approved") return "Approved Atasan";
  if (key === "pending") return "Menunggu Atasan";
  if (key === "rejected") return "Ditolak Atasan";
  return value || "-";
}

function formatHRStatus(confirmation: PeriodConfirmation) {
  if (confirmation.is_locked) return "Locked";

  const status = normalize(confirmation.hr_status);

  if (status === "finalized") return "Finalized";
  if (status === "ready_for_hr") {
    return confirmation.hr_note ? "Sudah Direview HR" : "Ready for HR";
  }

  return confirmation.hr_status || "-";
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}