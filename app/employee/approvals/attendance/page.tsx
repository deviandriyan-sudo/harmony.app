"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Loader2,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
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
  supervisor_1: string | null;
  supervisor_2: string | null;
  is_active: boolean | null;
};

type EmployeeAssignment = {
  id?: string | null;
  employee_id?: string | null;
  supervisor_1?: string | null;
  supervisor_2?: string | null;
  is_active?: boolean | null;
};

type AttendancePeriodConfirmation = {
  id: string;
  employee_id: string;
  employee_number: string | null;
  machine_pin: string | null;
  full_name: string | null;
  department: string | null;
  position: string | null;
  period_month: string;
  period_start: string | null;
  period_end: string | null;
  employee_status: string | null;
  employee_submitted_at: string | null;
  supervisor_status: string | null;
  supervisor_id: string | null;
  supervisor_name: string | null;
  supervisor_approved_at: string | null;
  supervisor_rejected_at: string | null;
  supervisor_note: string | null;
  hr_status: string | null;
  hr_finalized_at: string | null;
  is_locked: boolean | null;
  locked_by: string | null;
  locked_at: string | null;
};

type StatusFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "locked"
  | "finalized";

type SummaryTone = "blue" | "green" | "orange" | "red" | "purple";

const ATTENDANCE_START_YEAR = 2026;

const MONTH_OPTIONS = [
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

export default function EmployeeAttendanceApprovalListPage() {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [supervisor, setSupervisor] = useState<Employee | null>(null);
  const [subordinates, setSubordinates] = useState<Employee[]>([]);
  const [confirmations, setConfirmations] = useState<
    AttendancePeriodConfirmation[]
  >([]);

  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const periodRange = useMemo(
    () => getCutoffRange(periodMonth),
    [periodMonth],
  );

  const employeeMap = useMemo(() => {
    return new Map(subordinates.map((employee) => [employee.id, employee]));
  }, [subordinates]);

  const summary = useMemo(() => {
    return confirmations.reduce(
      (acc, item) => {
        acc.total += 1;

        const supervisorStatus = normalizeStatus(item.supervisor_status);
        const hrStatus = normalizeStatus(item.hr_status);

        if (supervisorStatus === "pending") acc.pending += 1;
        if (supervisorStatus === "approved") acc.approved += 1;
        if (supervisorStatus === "rejected") acc.rejected += 1;
        if (Boolean(item.is_locked)) acc.locked += 1;
        if (hrStatus === "finalized") acc.finalized += 1;

        return acc;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        locked: 0,
        finalized: 0,
      },
    );
  }, [confirmations]);

  const filteredConfirmations = useMemo(() => {
    const query = normalizeText(searchQuery);

    return confirmations.filter((item) => {
      const employee = employeeMap.get(item.employee_id);

      const employeeName =
        item.full_name || employee?.full_name || "";
      const employeeNumber =
        item.employee_number || employee?.employee_number || "";
      const department =
        item.department || employee?.department || "";
      const position =
        item.position || employee?.position || "";

      const matchesSearch =
        !query ||
        [
          employeeName,
          employeeNumber,
          department,
          position,
          item.period_month,
        ].some((value) => normalizeText(value).includes(query));

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "locked") return Boolean(item.is_locked);
      if (statusFilter === "finalized") {
        return normalizeStatus(item.hr_status) === "finalized";
      }

      return normalizeStatus(item.supervisor_status) === statusFilter;
    });
  }, [confirmations, employeeMap, searchQuery, statusFilter]);

  useEffect(() => {
    fetchData(false);
  }, [periodMonth]);

  async function fetchData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error(
          "Session user belum ditemukan. Silakan login ulang.",
        );
      }

      let currentAppUser: AppUser | null = null;

      const byId = await supabase
        .from("app_users")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle<AppUser>();

      if (!byId.error && byId.data) {
        currentAppUser = byId.data;
      } else if (authData.user.email) {
        const byEmail = await supabase
          .from("app_users")
          .select("*")
          .eq("email", authData.user.email.toLowerCase())
          .maybeSingle<AppUser>();

        if (!byEmail.error) {
          currentAppUser = byEmail.data || null;
        }
      }

      if (!currentAppUser) {
        throw new Error("Akun HARMONY belum terhubung ke app_users.");
      }

      if (currentAppUser.is_active === false) {
        throw new Error("Akun HARMONY sedang nonaktif. Hubungi HR.");
      }

      if (!currentAppUser.employee_id) {
        throw new Error("Akun belum terhubung ke data employee.");
      }

      setAppUser(currentAppUser);

      const { data: supervisorData, error: supervisorError } =
        await supabase
          .from("employees")
          .select("*")
          .eq("id", currentAppUser.employee_id)
          .maybeSingle<Employee>();

      if (supervisorError) throw supervisorError;
      if (!supervisorData) {
        throw new Error("Data atasan tidak ditemukan.");
      }

      setSupervisor(supervisorData);

      const { data: employeeData, error: employeeError } =
        await supabase
          .from("employees")
          .select("*")
          .eq("is_active", true);

      if (employeeError) throw employeeError;

      const activeEmployees = (employeeData || []) as Employee[];

      const assignmentResponse = await supabase
        .from("employee_assignments")
        .select("*")
        .eq("is_active", true);

      if (assignmentResponse.error) {
        console.warn(
          "Approval attendance: employee_assignments gagal dimuat, fallback ke employees.",
          assignmentResponse.error.message,
        );
      }

      const activeAssignments = assignmentResponse.error
        ? []
        : ((assignmentResponse.data || []) as EmployeeAssignment[]);

      const subordinateIds = resolveSubordinateIds(
        supervisorData,
        activeEmployees,
        activeAssignments,
      );

      const subordinateList = activeEmployees.filter((employee) =>
        subordinateIds.has(employee.id),
      );

      setSubordinates(subordinateList);

      if (subordinateList.length === 0) {
        setConfirmations([]);
        return;
      }

      const ids = subordinateList.map((employee) => employee.id);

      const { data: confirmationData, error: confirmationError } =
        await supabase
          .from("attendance_period_confirmations")
          .select("*")
          .in("employee_id", ids)
          .eq("period_month", periodMonth)
          .order("employee_submitted_at", {
            ascending: false,
            nullsFirst: false,
          });

      if (confirmationError) throw confirmationError;

      const relevantConfirmations = (
        (confirmationData || []) as AttendancePeriodConfirmation[]
      ).filter((item) => {
        const employeeStatus = normalizeStatus(item.employee_status);
        const supervisorStatus = normalizeStatus(item.supervisor_status);
        const hrStatus = normalizeStatus(item.hr_status);

        return (
          employeeStatus === "submitted" ||
          ["pending", "approved", "rejected"].includes(supervisorStatus) ||
          ["ready_for_hr", "finalized", "rejected_by_supervisor"].includes(
            hrStatus,
          ) ||
          Boolean(item.is_locked)
        );
      });

      setConfirmations(relevantConfirmations);
    } catch (error: any) {
      setConfirmations([]);
      setErrorMessage(
        error?.message ||
          "Data approval absensi tim belum berhasil dimuat.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const normalizedPeriod = normalizePeriodMonth(periodMonth);
  const [selectedYear, selectedMonth] = normalizedPeriod.split("-");

  return (
    <>
      <Topbar
        title="Approval Absensi Tim"
        description="Review absensi bawahan yang sudah disubmit sebelum diteruskan ke HR."
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
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <Link
                href="/employee/approvals"
                className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 transition hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Kembali ke Approval Tim
              </Link>

              <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/75">
                <ShieldCheck size={15} className="text-[#5ac8fa]" />
                Supervisor Attendance Approval
              </div>

              <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl xl:text-4xl">
                Approval Absensi Bawahan
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
                Pilih pengajuan periode bawahan untuk melihat detail harian,
                bukti, PHL, cuti/izin, lalu approve atau reject dari halaman
                detail.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:min-w-[600px]">
              <HeroMetric label="Bawahan" value={String(subordinates.length)} />
              <HeroMetric label="Submit" value={String(summary.total)} />
              <HeroMetric label="Pending" value={String(summary.pending)} />
              <HeroMetric label="Approved" value={String(summary.approved)} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total Pengajuan"
            value={String(summary.total)}
            description={getPeriodLabel(periodMonth)}
            icon={<CalendarCheck size={21} />}
            tone="blue"
          />
          <SummaryCard
            title="Menunggu Approval"
            value={String(summary.pending)}
            description="Perlu review atasan"
            icon={<Clock3 size={21} />}
            tone="orange"
          />
          <SummaryCard
            title="Disetujui"
            value={String(summary.approved)}
            description="Siap / sudah diteruskan HR"
            icon={<CheckCircle2 size={21} />}
            tone="green"
          />
          <SummaryCard
            title="Ditolak"
            value={String(summary.rejected)}
            description="Dikembalikan ke employee"
            icon={<XCircle size={21} />}
            tone="red"
          />
          <SummaryCard
            title="Locked / Final"
            value={`${summary.locked} / ${summary.finalized}`}
            description="Read-only"
            icon={<Lock size={21} />}
            tone="purple"
          />
        </div>

        <div className="harmony-card overflow-hidden p-0">
          <div className="border-b border-black/5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
                  <Filter size={18} />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#1d1d1f]">
                    Filter Approval
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#6e6e73]">
                    Periode cutoff: {formatDisplayDate(periodRange.start)} -{" "}
                    {formatDisplayDate(periodRange.end)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchData(true)}
                disabled={refreshing || loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white px-4 text-sm font-bold text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <RefreshCcw size={17} />
                )}
                Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_120px_220px_minmax(240px,1fr)]">
              <label className="block">
                <span className="harmony-label">Bulan</span>
                <select
                  value={selectedMonth}
                  onChange={(event) =>
                    setPeriodMonth(
                      updatePeriodPart(
                        periodMonth,
                        "month",
                        event.target.value,
                      ),
                    )
                  }
                  className="harmony-select"
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="harmony-label">Tahun</span>
                <select
                  value={selectedYear}
                  onChange={(event) =>
                    setPeriodMonth(
                      updatePeriodPart(
                        periodMonth,
                        "year",
                        event.target.value,
                      ),
                    )
                  }
                  className="harmony-select"
                >
                  {getAttendanceYearOptions().map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="harmony-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                  className="harmony-select"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu Approval</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                  <option value="locked">Locked</option>
                  <option value="finalized">Final HR</option>
                </select>
              </label>

              <label className="block">
                <span className="harmony-label">Cari Karyawan</span>
                <div className="relative">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]"
                  />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Nama, NIP, unit, jabatan..."
                    className="harmony-input pl-11"
                  />
                </div>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat pengajuan absensi bawahan...
            </div>
          ) : subordinates.length === 0 ? (
            <EmptyState
              icon={<UsersRound size={25} />}
              title="Belum ada bawahan terhubung"
              description="Relasi bawahan dibaca dari supervisor_1/supervisor_2 pada employees dan employee_assignments aktif."
            />
          ) : confirmations.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={25} />}
              title="Belum ada pengajuan absensi"
              description={`Belum ada bawahan yang submit absensi untuk periode ${getPeriodLabel(periodMonth)}.`}
            />
          ) : filteredConfirmations.length === 0 ? (
            <EmptyState
              icon={<Search size={25} />}
              title="Data tidak ditemukan"
              description="Tidak ada pengajuan yang sesuai dengan pencarian atau filter status."
            />
          ) : (
            <>
              <div className="grid gap-3 p-4 2xl:hidden">
                {filteredConfirmations.map((confirmation) => (
                  <MobileApprovalCard
                    key={confirmation.id}
                    confirmation={confirmation}
                    employee={employeeMap.get(confirmation.employee_id)}
                  />
                ))}
              </div>

              <div className="hidden overflow-x-auto 2xl:block">
                <table className="min-w-[1220px] w-full table-fixed border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
                      <th className="w-[250px] px-4 py-3 font-semibold">
                        Karyawan
                      </th>
                      <th className="w-[190px] px-4 py-3 font-semibold">
                        Periode
                      </th>
                      <th className="w-[150px] px-4 py-3 font-semibold">
                        Submit
                      </th>
                      <th className="w-[140px] px-4 py-3 font-semibold">
                        Status Atasan
                      </th>
                      <th className="w-[130px] px-4 py-3 font-semibold">
                        Status HR
                      </th>
                      <th className="w-[110px] px-4 py-3 font-semibold">
                        Lock
                      </th>
                      <th className="w-[140px] px-4 py-3 text-center font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredConfirmations.map((confirmation) => {
                      const employee = employeeMap.get(
                        confirmation.employee_id,
                      );

                      return (
                        <tr
                          key={confirmation.id}
                          className="border-b border-black/5 transition hover:bg-[#f8f8fa]"
                        >
                          <td className="px-4 py-4 align-top">
                            <EmployeeIdentity
                              confirmation={confirmation}
                              employee={employee}
                            />
                          </td>

                          <td className="px-4 py-4 align-top">
                            <p className="font-bold text-[#1d1d1f]">
                              {formatDisplayDate(
                                confirmation.period_start ||
                                  periodRange.start,
                              )}{" "}
                              -{" "}
                              {formatDisplayDate(
                                confirmation.period_end ||
                                  periodRange.end,
                              )}
                            </p>
                            <p className="mt-1 text-xs text-[#86868b]">
                              {formatPeriodMonthLabel(
                                confirmation.period_month,
                              )}
                            </p>
                          </td>

                          <td className="px-4 py-4 align-top text-[#6e6e73]">
                            {formatDateTime(
                              confirmation.employee_submitted_at || "",
                            )}
                          </td>

                          <td className="px-4 py-4 align-top">
                            <StatusBadge
                              status={confirmation.supervisor_status}
                            />
                          </td>

                          <td className="px-4 py-4 align-top">
                            <HRStatusBadge status={confirmation.hr_status} />
                          </td>

                          <td className="px-4 py-4 align-top">
                            {confirmation.is_locked ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                                <Lock size={13} />
                                Locked
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                                Open
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-center align-top">
                            <ReviewButton confirmation={confirmation} />
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

        <div className="rounded-[28px] border border-[#cfe3ff] bg-[#f4f9ff] p-5 text-sm leading-6 text-[#41607d]">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white p-2.5 text-[#007aff] shadow-sm">
              <Eye size={18} />
            </div>
            <div>
              <p className="font-bold text-[#1d1d1f]">
                Flow approval tidak diubah
              </p>
              <p className="mt-1">
                Halaman ini hanya daftar pengajuan. Tombol Review membuka
                detail approval existing untuk approve/reject harian maupun
                approve/reject periode sebelum diteruskan ke HR.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MobileApprovalCard({
  confirmation,
  employee,
}: {
  confirmation: AttendancePeriodConfirmation;
  employee?: Employee;
}) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white p-4 shadow-sm">
      <EmployeeIdentity confirmation={confirmation} employee={employee} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniData
          label="Periode"
          value={formatPeriodMonthLabel(confirmation.period_month)}
        />
        <MiniData
          label="Submit"
          value={formatDateTime(confirmation.employee_submitted_at || "")}
        />
        <MiniData
          label="Status Atasan"
          value={formatSupervisorStatus(confirmation.supervisor_status)}
        />
        <MiniData
          label="Status HR"
          value={formatHRStatus(confirmation.hr_status)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={confirmation.supervisor_status} />
          {confirmation.is_locked && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
              <Lock size={13} />
              Locked
            </span>
          )}
        </div>

        <ReviewButton confirmation={confirmation} />
      </div>
    </div>
  );
}

function ReviewButton({
  confirmation,
}: {
  confirmation: AttendancePeriodConfirmation;
}) {
  return (
    <Link
      href={`/employee/approvals/${encodeURIComponent(
        confirmation.employee_id,
      )}/${encodeURIComponent(confirmation.period_month)}`}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#007aff] px-4 text-xs font-bold text-white transition hover:bg-[#0066d6]"
    >
      <Eye size={15} />
      {normalizeStatus(confirmation.supervisor_status) === "pending"
        ? "Review"
        : "Lihat Detail"}
      <ArrowUpRight size={14} />
    </Link>
  );
}

function EmployeeIdentity({
  confirmation,
  employee,
}: {
  confirmation: AttendancePeriodConfirmation;
  employee?: Employee;
}) {
  const name =
    confirmation.full_name || employee?.full_name || "Karyawan";
  const number =
    confirmation.employee_number || employee?.employee_number || "-";
  const department =
    confirmation.department || employee?.department || "-";
  const position =
    confirmation.position || employee?.position || "-";

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8f2ff] text-[#007aff]">
        <UserRound size={18} />
      </div>

      <div className="min-w-0">
        <p className="break-words text-sm font-bold leading-5 text-[#1d1d1f]">
          {name}
        </p>
        <p className="mt-1 break-words text-xs leading-5 text-[#6e6e73]">
          {number} · {department}
        </p>
        <p className="break-words text-xs leading-5 text-[#86868b]">
          {position}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeStatus(status);

  const className =
    normalized === "approved"
      ? "bg-green-50 text-green-700"
      : normalized === "rejected"
        ? "bg-red-50 text-red-700"
        : normalized === "pending"
          ? "bg-orange-50 text-orange-700"
          : "bg-[#f5f5f7] text-[#6e6e73]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {formatSupervisorStatus(status)}
    </span>
  );
}

function HRStatusBadge({ status }: { status?: string | null }) {
  const normalized = normalizeStatus(status);

  const className =
    normalized === "finalized"
      ? "bg-green-50 text-green-700"
      : normalized === "ready_for_hr"
        ? "bg-[#e8f2ff] text-[#0059b8]"
        : normalized.includes("rejected")
          ? "bg-red-50 text-red-700"
          : "bg-[#f5f5f7] text-[#6e6e73]";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}
    >
      {formatHRStatus(status)}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6">
      <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
          {icon}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
          {description}
        </p>
      </div>
    </div>
  );
}

function MiniData({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7]/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-bold leading-5 text-[#1d1d1f]">
        {value}
      </p>
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
  tone: SummaryTone;
}) {
  const toneClass = {
    blue: "text-[#007aff] bg-[#e8f2ff]",
    green: "text-[#168034] bg-[#eaf8ee]",
    orange: "text-[#b35b00] bg-[#fff4e5]",
    red: "text-red-700 bg-red-50",
    purple: "text-[#7b2cbf] bg-[#f7edfc]",
  }[tone];

  return (
    <div className="harmony-card harmony-hover-lift p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6e6e73]">{title}</p>
          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`shrink-0 rounded-2xl p-3 ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function resolveSubordinateIds(
  supervisor: Employee,
  employees: Employee[],
  assignments: EmployeeAssignment[],
) {
  const supervisorReferences = new Set(
    [
      supervisor.id,
      supervisor.employee_number,
      supervisor.full_name,
      supervisor.email,
    ]
      .map(normalizeText)
      .filter(Boolean),
  );

  const subordinateIds = new Set<string>();

  employees.forEach((employee) => {
    if (employee.id === supervisor.id) return;

    const refs = [employee.supervisor_1, employee.supervisor_2]
      .map(normalizeText)
      .filter(Boolean);

    if (refs.some((reference) => supervisorReferences.has(reference))) {
      subordinateIds.add(employee.id);
    }
  });

  assignments.forEach((assignment) => {
    if (assignment.is_active === false) return;

    const employeeId = String(assignment.employee_id || "").trim();
    if (!employeeId || employeeId === supervisor.id) return;

    const refs = [assignment.supervisor_1, assignment.supervisor_2]
      .map(normalizeText)
      .filter(Boolean);

    if (refs.some((reference) => supervisorReferences.has(reference))) {
      subordinateIds.add(employeeId);
    }
  });

  return subordinateIds;
}

function getAttendanceYearOptions() {
  const currentYear = new Date().getFullYear();
  const lastYear = Math.max(
    currentYear + 10,
    ATTENDANCE_START_YEAR + 10,
  );

  return Array.from(
    { length: lastYear - ATTENDANCE_START_YEAR + 1 },
    (_, index) => ATTENDANCE_START_YEAR + index,
  );
}

function normalizePeriodMonth(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return getCurrentPeriodMonth();

  const year = Math.max(Number(match[1]), ATTENDANCE_START_YEAR);
  const monthNumber = Math.min(Math.max(Number(match[2]), 1), 12);

  return `${year}-${String(monthNumber).padStart(2, "0")}`;
}

function updatePeriodPart(
  currentPeriod: string,
  part: "month" | "year",
  value: string,
) {
  const normalized = normalizePeriodMonth(currentPeriod);
  const [year, month] = normalized.split("-");

  if (part === "year") {
    const nextYear = Math.max(
      Number(value || year),
      ATTENDANCE_START_YEAR,
    );
    return `${nextYear}-${month}`;
  }

  const nextMonth = String(
    Math.min(Math.max(Number(value || month), 1), 12),
  ).padStart(2, "0");

  return `${year}-${nextMonth}`;
}

function getCurrentPeriodMonth() {
  const today = new Date();
  const period = new Date(today);

  if (today.getDate() <= 10) {
    period.setMonth(period.getMonth() - 1);
  }

  const value = `${period.getFullYear()}-${String(
    period.getMonth() + 1,
  ).padStart(2, "0")}`;

  return value < "2026-01" ? "2026-01" : value;
}

function getCutoffRange(periodMonth: string) {
  const normalized = normalizePeriodMonth(periodMonth);
  const [yearText, monthText] = normalized.split("-");

  const year = Number(yearText);
  const month = Number(monthText);

  return {
    start: formatDateToISO(new Date(year, month - 1, 11)),
    end: formatDateToISO(new Date(year, month, 10)),
  };
}

function getPeriodLabel(periodMonth: string) {
  const range = getCutoffRange(periodMonth);
  return `${formatDisplayDate(range.start)} - ${formatDisplayDate(
    range.end,
  )}`;
}

function formatPeriodMonthLabel(periodMonth: string) {
  const normalized = normalizePeriodMonth(periodMonth);
  const [year, month] = normalized.split("-");

  const monthLabel =
    MONTH_OPTIONS.find((item) => item.value === month)?.label || month;

  return `${monthLabel} ${year}`;
}

function formatDateToISO(date: Date) {
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

function formatSupervisorStatus(value?: string | null) {
  const status = normalizeStatus(value);

  if (status === "approved") return "Disetujui";
  if (status === "rejected") return "Ditolak";
  if (status === "pending") return "Menunggu";

  return value || "-";
}

function formatHRStatus(value?: string | null) {
  const status = normalizeStatus(value);

  if (status === "ready_for_hr") return "Siap HR";
  if (status === "finalized") return "Final HR";
  if (status === "waiting_supervisor") return "Menunggu Atasan";
  if (status === "rejected_by_supervisor") return "Ditolak Atasan";
  if (status === "pending") return "Menunggu";

  return value || "-";
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value: unknown) {
  return normalizeText(value).replace(/\s+/g, "_");
}