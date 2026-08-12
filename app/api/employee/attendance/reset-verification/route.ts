import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function getPeriodRange(periodMonth: string) {
  const match = periodMonth.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!year || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(year, month - 1, 11);
  const end = new Date(year, month, 10);

  const toIso = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

  return {
    start: toIso(start),
    end: toIso(end),
  };
}

function isSubmittedOrLocked(confirmation: any) {
  return Boolean(
    confirmation?.is_locked ||
      confirmation?.employee_status === "submitted" ||
      confirmation?.supervisor_status === "pending" ||
      confirmation?.supervisor_status === "approved" ||
      confirmation?.hr_status === "ready_for_hr" ||
      confirmation?.hr_status === "finalized",
  );
}

function isPureEmployeeManualLog(log: any) {
  const source = normalize(log?.source);

  const noMachineData =
    !log?.upload_id &&
    !log?.check_in &&
    !log?.check_out &&
    Number(log?.total_punches || 0) === 0;

  const employeeSource = [
    "employee_manual_confirmation",
    "employee_correction",
    "employee_attendance_confirmation",
  ].includes(source);

  const absenceOwnedByEmployeeConfirmation =
    !log?.absence_request_source ||
    normalize(log?.absence_request_source) ===
      "employee_attendance_confirmation";

  return (
    noMachineData &&
    employeeSource &&
    absenceOwnedByEmployeeConfirmation
  );
}

function publicStoragePathFromUrl(url: unknown) {
  const value = clean(url);

  if (!value) return "";

  const marker = "/storage/v1/object/public/leave-attachments/";
  const index = value.indexOf(marker);

  if (index < 0) return "";

  return decodeURIComponent(value.slice(index + marker.length));
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase server environment belum lengkap. Hubungi administrator.",
        },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Session login tidak ditemukan.",
        },
        { status: 401 },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } =
      await admin.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Session login tidak valid. Silakan login ulang.",
        },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);

    const employeeId = clean(body?.employee_id);
    const attendanceLogId = clean(body?.attendance_log_id);
    const attendanceDate = clean(body?.attendance_date);
    const periodMonth = clean(body?.period_month);

    if (!employeeId || !attendanceLogId || !attendanceDate || !periodMonth) {
      return NextResponse.json(
        {
          success: false,
          error: "Data reset verifikasi belum lengkap.",
        },
        { status: 400 },
      );
    }

    const periodRange = getPeriodRange(periodMonth);

    if (
      !periodRange ||
      attendanceDate < periodRange.start ||
      attendanceDate > periodRange.end
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Tanggal absensi tidak sesuai dengan periode yang dipilih.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------------
    // Resolve active app user
    // --------------------------------------------------------
    let appUser: any = null;

    const byId = await admin
      .from("app_users")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (!byId.error && byId.data) {
      appUser = byId.data;
    } else if (authData.user.email) {
      const byEmail = await admin
        .from("app_users")
        .select("*")
        .eq("email", normalize(authData.user.email))
        .maybeSingle();

      if (!byEmail.error) {
        appUser = byEmail.data;
      }
    }

    if (!appUser || appUser.is_active === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun HARMONY tidak aktif atau belum terdaftar.",
        },
        { status: 403 },
      );
    }

    const { data: employee, error: employeeError } = await admin
      .from("employees")
      .select("id, email, employee_number, machine_pin, full_name")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      return NextResponse.json(
        {
          success: false,
          error: "Data karyawan tidak ditemukan.",
        },
        { status: 404 },
      );
    }

    const appUserOwnsEmployee =
      clean(appUser.employee_id) === employeeId;

    const emailMatches =
      normalize(authData.user.email) !== "" &&
      normalize(authData.user.email) === normalize(employee.email);

    if (!appUserOwnsEmployee && !emailMatches) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Anda hanya dapat mereset verifikasi absensi milik sendiri.",
        },
        { status: 403 },
      );
    }

    // --------------------------------------------------------
    // Period must still be editable
    // --------------------------------------------------------
    const { data: confirmation } = await admin
      .from("attendance_period_confirmations")
      .select(
        "id, employee_status, supervisor_status, hr_status, is_locked",
      )
      .eq("employee_id", employeeId)
      .eq("period_month", periodMonth)
      .maybeSingle();

    if (isSubmittedOrLocked(confirmation)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Periode sudah disubmit/dikunci. Reset hanya dapat dilakukan sebelum Submit Periode ke Atasan.",
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------------
    // Read row and verify ownership/date
    // --------------------------------------------------------
    const { data: log, error: logError } = await admin
      .from("attendance_logs")
      .select("*")
      .eq("id", attendanceLogId)
      .is("deleted_at", null)
      .maybeSingle();

    if (logError || !log) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Data absensi yang akan direset tidak ditemukan atau sudah dihapus.",
        },
        { status: 404 },
      );
    }

    const logMatchesEmployee =
      clean(log.employee_id) === employeeId ||
      (
        clean(employee.machine_pin) !== "" &&
        clean(log.machine_pin) === clean(employee.machine_pin)
      );

    if (!logMatchesEmployee || clean(log.attendance_date) !== attendanceDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Data absensi tidak sesuai dengan karyawan/tanggal.",
        },
        { status: 403 },
      );
    }

    if (log.is_locked) {
      return NextResponse.json(
        {
          success: false,
          error: "Data absensi sudah dikunci HR dan tidak dapat direset.",
        },
        { status: 409 },
      );
    }

    // Best-effort cleanup proof files uploaded by employee.
    const proofPaths = [
      publicStoragePathFromUrl(log.correction_proof_url),
      publicStoragePathFromUrl(log.phl_proof_url),
      publicStoragePathFromUrl(log.absence_proof_url),
    ].filter(Boolean);

    // --------------------------------------------------------
    // Pure manual employee row -> hard delete
    // --------------------------------------------------------
    if (isPureEmployeeManualLog(log)) {
      const { error: deleteError } = await admin
        .from("attendance_logs")
        .delete()
        .eq("id", log.id);

      if (deleteError) {
        return NextResponse.json(
          {
            success: false,
            error: deleteError.message,
          },
          { status: 500 },
        );
      }

      if (proofPaths.length > 0) {
        await admin.storage
          .from("leave-attachments")
          .remove(proofPaths);
      }

      return NextResponse.json({
        success: true,
        mode: "deleted",
        attendance_log_id: log.id,
        attendance_date: attendanceDate,
        message:
          "Data manual employee berhasil dihapus dari attendance_logs.",
      });
    }

    // --------------------------------------------------------
    // Machine/system row -> preserve source data, clear only
    // employee verification fields.
    // --------------------------------------------------------
    const ownedAbsenceRequest =
      normalize(log.absence_request_source) ===
      "employee_attendance_confirmation";

    const employeeCorrection =
      normalize(log.correction_submitted_role) === "employee" ||
      normalize(log.source) === "employee_correction" ||
      normalize(log.source) === "employee_manual_confirmation";

    const updatePayload: Record<string, unknown> = {
      manual_check_in: null,
      manual_check_out: null,
      requested_check_in: null,
      requested_check_out: null,
      employee_daily_note: null,

      employee_confirmation_status: null,
      employee_confirmed_at: null,
      employee_confirmation_batch_id: null,

      is_phl_candidate: false,
      phl_proof_url: null,
      phl_proof_name: null,

      updated_at: new Date().toISOString(),
    };

    if (ownedAbsenceRequest) {
      updatePayload.absence_request_type = null;
      updatePayload.absence_request_label = null;
      updatePayload.absence_request_status = null;
      updatePayload.absence_request_source = null;
      updatePayload.absence_proof_url = null;
      updatePayload.absence_proof_name = null;
    }

    if (employeeCorrection) {
      updatePayload.correction_status = null;
      updatePayload.correction_type = null;
      updatePayload.correction_reason = null;
      updatePayload.correction_proof_url = null;
      updatePayload.correction_proof_name = null;
      updatePayload.correction_submitted_by = null;
      updatePayload.correction_submitted_role = null;
      updatePayload.correction_submitted_at = null;

      updatePayload.supervisor_approval_status = null;
      updatePayload.supervisor_approved_by = null;
      updatePayload.supervisor_approved_at = null;

      updatePayload.hr_approval_status = null;
      updatePayload.hr_approved_by = null;
      updatePayload.hr_approved_at = null;

      updatePayload.hr_final_status = null;
    }

    const { error: updateError } = await admin
      .from("attendance_logs")
      .update(updatePayload)
      .eq("id", log.id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: updateError.message,
        },
        { status: 500 },
      );
    }

    if (proofPaths.length > 0) {
      await admin.storage
        .from("leave-attachments")
        .remove(proofPaths);
    }

    return NextResponse.json({
      success: true,
      mode: "reset",
      attendance_log_id: log.id,
      attendance_date: attendanceDate,
      message:
        "Data verifikasi manual berhasil dibersihkan. Data fingerprint asli dipertahankan.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Terjadi kesalahan saat mereset verifikasi absensi.",
      },
      { status: 500 },
    );
  }
}