"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  History,
  Loader2,
  Lock,
  LockOpen,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Topbar } from "@/components/layout/Topbar";
import { supabase } from "@/lib/supabase";

type AuditLog = {
  id: string;

  action_type: string;
  action_label: string;

  period_month: string | null;
  period_start: string | null;
  period_end: string | null;

  employee_id: string | null;
  employee_number: string | null;
  machine_pin: string | null;
  full_name: string | null;
  department: string | null;
  position: string | null;

  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;

  total_affected: number | null;

  note: string | null;
  metadata: Record<string, unknown> | null;

  created_at: string | null;
};

type ActionFilter =
  | "all"
  | "hr_finalize_period"
  | "hr_lock_period"
  | "hr_unlock_period";

export default function AttendanceAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [periodMonth, setPeriodMonth] = useState(getCurrentPeriodMonth());
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const periodRange = useMemo(() => {
    return getCutoffRange(periodMonth);
  }, [periodMonth]);

  const filteredLogs = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return logs.filter((item) => {
      const matchAction =
        actionFilter === "all" || item.action_type === actionFilter;

      const matchKeyword =
        !keyword ||
        item.action_label?.toLowerCase().includes(keyword) ||
        item.action_type?.toLowerCase().includes(keyword) ||
        item.actor_name?.toLowerCase().includes(keyword) ||
        item.actor_role?.toLowerCase().includes(keyword) ||
        item.note?.toLowerCase().includes(keyword) ||
        item.period_month?.toLowerCase().includes(keyword) ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.employee_number?.toLowerCase().includes(keyword) ||
        item.department?.toLowerCase().includes(keyword) ||
        item.position?.toLowerCase().includes(keyword);

      return matchAction && matchKeyword;
    });
  }, [logs, actionFilter, searchKeyword]);

  const summary = useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        acc.total += 1;

        if (item.action_type === "hr_finalize_period") {
          acc.finalize += 1;
        }

        if (item.action_type === "hr_lock_period") {
          acc.lock += 1;
        }

        if (item.action_type === "hr_unlock_period") {
          acc.unlock += 1;
        }

        acc.affected += Number(item.total_affected || 0);

        return acc;
      },
      {
        total: 0,
        finalize: 0,
        lock: 0,
        unlock: 0,
        affected: 0,
      },
    );
  }, [logs]);

  useEffect(() => {
    fetchAuditLogs();
  }, [periodMonth]);

  async function fetchAuditLogs() {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    const query = supabase
      .from("attendance_audit_logs")
      .select("*")
      .eq("period_month", periodMonth)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLogs(data || []);
    setLoading(false);
  }

  function exportCsv() {
    if (filteredLogs.length === 0) {
      setErrorMessage("Tidak ada data audit untuk diexport.");
      return;
    }

    const rows = filteredLogs.map((item, index) => ({
      No: index + 1,
      Waktu: formatDateTime(item.created_at || ""),
      Aksi: item.action_label || "-",
      "Kode Aksi": item.action_type || "-",
      Periode: item.period_month || "-",
      "Tanggal Mulai": formatDisplayDate(item.period_start || ""),
      "Tanggal Selesai": formatDisplayDate(item.period_end || ""),
      Aktor: item.actor_name || "-",
      Role: item.actor_role || "-",
      "Total Terdampak": item.total_affected || 0,
      Karyawan: item.full_name || "-",
      NIP: item.employee_number || "-",
      Unit: item.department || "-",
      Jabatan: item.position || "-",
      Catatan: item.note || "-",
      Metadata: JSON.stringify(item.metadata || {}),
    }));

    const headers = Object.keys(rows[0]);
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

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `AUDIT_ABSENSI_${periodMonth}.csv`;
    link.click();

    URL.revokeObjectURL(url);

    setSuccessMessage("Export CSV audit absensi berhasil dibuat.");
  }

  return (
    <>
      <Topbar
        title="Audit Absensi"
        description="Riwayat finalisasi, lock, unlock, dan aksi penting absensi HR."
      />

      <section className="harmony-page-bg min-h-screen space-y-6 overflow-x-hidden p-4 sm:p-6">
        {successMessage && <AlertBox type="success" message={successMessage} />}

        {errorMessage && <AlertBox type="warning" message={errorMessage} />}

        <section className="relative overflow-hidden rounded-[30px] border border-black/5 bg-[#1d1d1f] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:rounded-[34px] sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#007aff]/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#34c759]/20 blur-3xl" />

          <div className="relative grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] 2xl:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/hr/attendance"
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 backdrop-blur-xl transition hover:bg-white/15"
                >
                  <ArrowLeft size={15} />
                  Kembali ke Absensi
                </Link>

                <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold text-white/75 backdrop-blur-xl">
                  <History size={15} className="text-[#5ac8fa]" />
                  Attendance Audit Trail
                </div>
              </div>

              <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl md:text-5xl">
                Audit Absensi
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">
                Pantau siapa yang melakukan finalisasi, lock, unlock, dan
                perubahan penting pada periode absensi.
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-2">
              <HeroMetric label="Total Log" value={String(summary.total)} />
              <HeroMetric label="Finalisasi" value={String(summary.finalize)} />
              <HeroMetric label="Lock" value={String(summary.lock)} />
              <HeroMetric label="Unlock" value={String(summary.unlock)} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          <SummaryCard
            title="Total Log"
            value={`${summary.total}`}
            description="Jumlah aktivitas pada periode ini"
            icon={<History size={22} />}
            tone="blue"
          />

          <SummaryCard
            title="Finalisasi HR"
            value={`${summary.finalize}`}
            description="Aktivitas finalisasi periode"
            icon={<ShieldCheck size={22} />}
            tone="green"
          />

          <SummaryCard
            title="Lock"
            value={`${summary.lock}`}
            description="Aktivitas penguncian periode"
            icon={<Lock size={22} />}
            tone="orange"
          />

          <SummaryCard
            title="Unlock"
            value={`${summary.unlock}`}
            description="Aktivitas buka lock periode"
            icon={<LockOpen size={22} />}
            tone="purple"
          />
        </section>

        <section className="harmony-card overflow-hidden">
          <div className="grid min-w-0 gap-4 border-b border-black/5 p-4 sm:p-5 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-end">
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-[210px_260px_minmax(260px,1fr)]">
              <label className="block min-w-0">
                <span className="harmony-label">Periode Cutoff</span>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(event) => setPeriodMonth(event.target.value)}
                  className="harmony-input"
                />
              </label>

              <label className="block min-w-0">
                <span className="harmony-label">Filter Aksi</span>
                <select
                  value={actionFilter}
                  onChange={(event) =>
                    setActionFilter(event.target.value as ActionFilter)
                  }
                  className="harmony-select"
                >
                  <option value="all">Semua Aksi</option>
                  <option value="hr_finalize_period">
                    Finalisasi Periode HR
                  </option>
                  <option value="hr_lock_period">Kunci Periode</option>
                  <option value="hr_unlock_period">Buka Lock Periode</option>
                </select>
              </label>

              <div className="min-w-0 md:col-span-2 xl:col-span-1">
                <span className="harmony-label">Rentang Periode</span>
                <div className="flex min-h-12 items-center rounded-2xl border border-black/5 bg-[#f5f5f7] px-4 text-sm font-semibold leading-6 text-[#1d1d1f]">
                  <span className="min-w-0 break-words">
                    {formatDisplayDate(periodRange.start)} -{" "}
                    {formatDisplayDate(periodRange.end)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end 2xl:justify-end">
              <label className="block min-w-0 sm:min-w-[260px] 2xl:w-[340px]">
                <span className="harmony-label">Pencarian</span>
                <div className="flex min-h-12 w-full items-center gap-3 rounded-[18px] border border-black/5 bg-[#f5f5f7]/85 px-4 shadow-sm transition focus-within:border-[#007aff]/40 focus-within:bg-white">
                  <Search size={18} className="shrink-0 text-[#86868b]" />
                  <input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="Cari aktor, aksi, catatan..."
                    className="min-h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9a9aa0]"
                  />
                </div>
              </label>

              <button
                type="button"
                onClick={exportCsv}
                className="harmony-button-secondary min-w-0 justify-center"
              >
                <Download size={18} />
                Export CSV
              </button>

              <button
                type="button"
                onClick={fetchAuditLogs}
                className="harmony-button-secondary min-w-0 justify-center"
              >
                <RefreshCcw size={18} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 p-6 text-sm text-[#6e6e73]">
              <Loader2 size={18} className="animate-spin" />
              Memuat audit log absensi...
            </div>
          ) : (
            <AuditTable logs={filteredLogs} />
          )}
        </section>
      </section>
    </>
  );
}

function AuditTable({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f5f5f7]/70 p-6 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-[#007aff] shadow-sm">
            <FileText size={24} />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">
            Belum ada audit log
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#6e6e73]">
            Audit log akan muncul setelah HR melakukan finalisasi, lock, atau
            unlock periode.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 p-4 xl:hidden">
        {logs.map((item) => (
          <AuditMobileCard key={item.id} item={item} />
        ))}
      </div>

      <div className="hidden overflow-hidden xl:block">
        <table className="w-full table-fixed border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-black/5 bg-[#f5f5f7]/90 text-xs uppercase tracking-wide text-[#6e6e73]">
              <th className="w-[15%] px-4 py-4 font-semibold">Waktu</th>
              <th className="w-[20%] px-4 py-4 font-semibold">Aksi</th>
              <th className="w-[16%] px-4 py-4 font-semibold">Periode</th>
              <th className="w-[19%] px-4 py-4 font-semibold">Aktor</th>
              <th className="w-[11%] px-4 py-4 font-semibold">Terdampak</th>
              <th className="w-[19%] px-4 py-4 font-semibold">Catatan</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((item) => (
              <tr
                key={item.id}
                className="border-b border-black/5 align-top transition hover:bg-[#f5f5f7]/70"
              >
                <td className="px-4 py-4">
                  <p className="break-words font-semibold leading-6 text-[#1d1d1f]">
                    {formatDateTime(item.created_at || "")}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <ActionBadge
                    actionType={item.action_type}
                    label={item.action_label}
                  />
                  <p className="mt-2 break-words text-xs leading-5 text-[#6e6e73]">
                    {item.action_type}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <p className="break-words font-semibold text-[#1d1d1f]">
                    {item.period_month || "-"}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-[#6e6e73]">
                    {formatDisplayDate(item.period_start || "")} -{" "}
                    {formatDisplayDate(item.period_end || "")}
                  </p>
                </td>

                <td className="px-4 py-4">
                  <ActorCell item={item} />
                </td>

                <td className="px-4 py-4">
                  <span className="inline-flex rounded-xl bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
                    {item.total_affected || 0} data
                  </span>
                </td>

                <td className="px-4 py-4">
                  <p className="break-words text-sm leading-6 text-[#6e6e73]">
                    {item.note || "-"}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AuditMobileCard({ item }: { item: AuditLog }) {
  return (
    <article className="rounded-[26px] border border-black/5 bg-white/80 p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <ActionBadge
            actionType={item.action_type}
            label={item.action_label}
          />
          <p className="mt-2 break-words text-xs leading-5 text-[#6e6e73]">
            {item.action_type}
          </p>
        </div>

        <span className="inline-flex w-fit rounded-xl bg-[#e8f2ff] px-3 py-1 text-xs font-bold text-[#0059b8]">
          {item.total_affected || 0} data
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniInfo label="Waktu" value={formatDateTime(item.created_at || "")} />
        <MiniInfo
          label="Periode"
          value={`${item.period_month || "-"} · ${formatDisplayDate(item.period_start || "")} - ${formatDisplayDate(item.period_end || "")}`}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-[#f5f5f7]/80 p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
          Aktor
        </p>
        <ActorCell item={item} />
      </div>

      <div className="mt-3 rounded-2xl bg-[#f5f5f7]/80 p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
          Catatan
        </p>
        <p className="break-words text-sm leading-6 text-[#6e6e73]">
          {item.note || "-"}
        </p>
      </div>
    </article>
  );
}

function ActorCell({ item }: { item: AuditLog }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#007aff]">
        <UserRound size={17} />
      </div>

      <div className="min-w-0">
        <p className="break-words font-semibold leading-5 text-[#1d1d1f]">
          {item.actor_name || "-"}
        </p>
        <p className="mt-1 break-words text-xs leading-5 text-[#6e6e73]">
          {item.actor_role || "-"}
        </p>
      </div>
    </div>
  );
}

function ActionBadge({
  actionType,
  label,
}: {
  actionType: string;
  label: string;
}) {
  const config =
    actionType === "hr_finalize_period"
      ? {
          className: "bg-green-50 text-green-700",
          icon: <ShieldCheck size={14} />,
        }
      : actionType === "hr_lock_period"
        ? {
            className: "bg-orange-50 text-orange-700",
            icon: <Lock size={14} />,
          }
        : actionType === "hr_unlock_period"
          ? {
              className: "bg-[#f7edfc] text-[#7b2cbf]",
              icon: <LockOpen size={14} />,
            }
          : {
              className: "bg-[#f5f5f7] text-[#6e6e73]",
              icon: <History size={14} />,
            };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold leading-5 ${config.className}`}
    >
      <span className="shrink-0">{config.icon}</span>
      <span className="min-w-0 break-words">{label || actionType}</span>
    </span>
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
  icon: React.ReactNode;
  tone: "blue" | "green" | "orange" | "purple";
}) {
  const toneClass = {
    blue: "text-[#007aff] bg-[#e8f2ff]",
    green: "text-[#168034] bg-[#eaf8ee]",
    orange: "text-[#b35b00] bg-[#fff4e5]",
    purple: "text-[#7b2cbf] bg-[#f7edfc]",
  }[tone];

  return (
    <div className="harmony-card harmony-hover-lift min-w-0 p-5">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium leading-5 text-[#6e6e73]">
            {title}
          </p>

          <h3 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[#1d1d1f]">
            {value}
          </h3>

          <p className="mt-1 break-words text-xs leading-5 text-[#86868b]">
            {description}
          </p>
        </div>

        <div className={`shrink-0 rounded-2xl p-3 ${toneClass}`}>{icon}</div>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
      <p className="break-words text-xs font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>

      <p className="mt-1 break-words text-xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f5f5f7]/80 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#86868b]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#1d1d1f]">
        {value || "-"}
      </p>
    </div>
  );
}

function AlertBox({
  type,
  message,
}: {
  type: "success" | "warning";
  message: string;
}) {
  const config =
    type === "success"
      ? {
          className: "border-green-200 bg-green-50 text-green-700",
          icon: <CheckCircle2 size={18} />,
          title: "Berhasil",
        }
      : {
          className: "border-orange-200 bg-orange-50 text-orange-700",
          icon: <AlertTriangle size={18} />,
          title: "Perhatian",
        };

  return (
    <div
      className={`rounded-2xl border p-4 text-sm leading-6 ${config.className}`}
    >
      <div className="mb-1 flex items-center gap-2 font-bold">
        {config.icon}
        {config.title}
      </div>
      {message}
    </div>
  );
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
