import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function normalize(value: unknown) {
  return clean(value).toLowerCase();
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayMakassar() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map = new Map(parts.map((part) => [part.type, part.value]));

  return `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
}

function getPeriodMonthForDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return "";
  }

  if (day >= 11) {
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  const previous = new Date(year, month - 2, 1);

  return `${previous.getFullYear()}-${String(
    previous.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function getPeriodRange(periodMonth: string) {
  const match = periodMonth.match(/^(\d{4})-(\d{2})$/);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);

  const toISO = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(date.getDate()).padStart(2, "0")}`;

  return {
    start: toISO(new Date(year, month - 1, 11)),
    end: toISO(new Date(year, month, 10)),
  };
}

function isPeriodReadOnly(confirmation: any) {
  const supervisor = normalize(confirmation?.supervisor_status);
  const hr = normalize(confirmation?.hr_status);

  return Boolean(
    confirmation?.is_locked ||
      supervisor === "pending" ||
      supervisor === "approved" ||
      hr === "ready_for_hr" ||
      hr === "finalized",
  );
}

function isRowReadOnly(log: any) {
  const supervisor = normalize(log?.supervisor_approval_status);
  const hrApproval = normalize(log?.hr_approval_status);
  const hrFinal = normalize(log?.hr_final_status);

  return Boolean(
    log?.is_locked ||
      supervisor === "pending" ||
      supervisor === "approved" ||
      hrApproval === "approved" ||
      hrFinal === "ready_for_hr" ||
      hrFinal === "finalized",
  );
}

function appendNote(existing: unknown, next: string) {
  const current = clean(existing);
  const stamped = `[${new Date().toISOString()}] ${next}`;

  return current ? `${current}\n${stamped}` : stamped;
}

function summaryStatus(checkIn: string, checkOut: string) {
  if (checkIn && checkOut) return "present";
  if (checkIn || checkOut) return "incomplete";
  return "no_record";
}

function createAdminClient() {
  const supabaseUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server environment belum lengkap. Hubungi administrator.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function resolveIdentity(
  request: NextRequest,
  admin: SupabaseClient,
  requestedEmployeeId: string,
) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Session login tidak ditemukan.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  const { data: authData, error: authError } =
    await admin.auth.getUser(token);

  if (authError || !authData.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Session login tidak valid. Silakan login ulang.",
        },
        {
          status: 401,
        },
      ),
    };
  }

  let appUser: any = null;

  const byId = await admin
    .from("app_users")
    .select("id, email, role, employee_id, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!byId.error && byId.data) {
    appUser = byId.data;
  } else if (authData.user.email) {
    const byEmail = await admin
      .from("app_users")
      .select("id, email, role, employee_id, is_active")
      .ilike("email", authData.user.email)
      .maybeSingle();

    if (!byEmail.error) {
      appUser = byEmail.data;
    }
  }

  if (!appUser || appUser.is_active === false) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Akun HARMONY tidak aktif atau belum terdaftar.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select(
      "id, email, employee_number, machine_pin, full_name, department, position, is_active",
    )
    .eq("id", requestedEmployeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Data employee tidak ditemukan.",
        },
        {
          status: 404,
        },
      ),
    };
  }

  if (employee.is_active === false) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Data employee sudah tidak aktif.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  /*
   * Primary ownership = app_users.employee_id.
   *
   * Email hanya dipakai sebagai fallback untuk akun legacy
   * yang belum mempunyai employee_id.
   *
   * Ini mencegah user yang salah terhubung mengakses
   * absensi manual karyawan lain.
   */
  const linkedEmployeeId = clean(appUser.employee_id);

  const ownsById =
    linkedEmployeeId !== "" &&
    linkedEmployeeId === requestedEmployeeId;

  const mayUseEmailFallback =
    linkedEmployeeId === "" &&
    normalize(authData.user.email) !== "" &&
    normalize(authData.user.email) === normalize(employee.email);

  if (!ownsById && !mayUseEmailFallback) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Anda hanya dapat mengakses absensi manual milik sendiri.",
        },
        {
          status: 403,
        },
      ),
    };
  }

  if (!clean(employee.machine_pin)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Machine PIN employee belum tersedia.",
        },
        {
          status: 400,
        },
      ),
    };
  }

  return {
    ok: true as const,
    authUser: authData.user,
    appUser,
    employee,
  };
}

async function readExistingLog(
  admin: SupabaseClient,
  machinePin: string,
  attendanceDate: string,
) {
  return admin
    .from("attendance_logs")
    .select("*")
    .eq("machine_pin", machinePin)
    .eq("attendance_date", attendanceDate)
    .is("deleted_at", null)
    .maybeSingle();
}

async function readPeriodConfirmation(
  admin: SupabaseClient,
  employeeId: string,
  periodMonth: string,
) {
  return admin
    .from("attendance_period_confirmations")
    .select(
      "id, employee_status, supervisor_status, hr_status, is_locked",
    )
    .eq("employee_id", employeeId)
    .eq("period_month", periodMonth)
    .maybeSingle();
}

export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();

    const employeeId = clean(
      request.nextUrl.searchParams.get("employee_id"),
    );

    const attendanceDate = clean(
      request.nextUrl.searchParams.get("attendance_date"),
    );

    if (!employeeId || !isISODate(attendanceDate)) {
      return NextResponse.json(
        {
          success: false,
          error: "Employee atau tanggal absensi tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    const identity = await resolveIdentity(
      request,
      admin,
      employeeId,
    );

    if (!identity.ok) {
      return identity.response;
    }

    const machinePin = clean(identity.employee.machine_pin);

    const periodMonth = getPeriodMonthForDate(attendanceDate);
    const periodRange = getPeriodRange(periodMonth);

    const [
      {
        data: record,
        error: logError,
      },
      {
        data: confirmation,
      },
    ] = await Promise.all([
      readExistingLog(
        admin,
        machinePin,
        attendanceDate,
      ),
      readPeriodConfirmation(
        admin,
        employeeId,
        periodMonth,
      ),
    ]);

    if (logError) {
      return NextResponse.json(
        {
          success: false,
          error: logError.message,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,

        record:
          record || null,

        period_month:
          periodMonth,

        period_start:
          periodRange?.start || null,

        period_end:
          periodRange?.end || null,

        editable:
          !isPeriodReadOnly(confirmation) &&
          !isRowReadOnly(record),

        summary_status:
          summaryStatus(
            clean(record?.check_in) ||
              clean(record?.manual_check_in) ||
              clean(record?.requested_check_in),

            clean(record?.check_out) ||
              clean(record?.manual_check_out) ||
              clean(record?.requested_check_out),
          ),
      },
      {
        status: 200,

        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Terjadi kesalahan saat membaca absensi manual.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient();

    const body = await request
      .json()
      .catch(() => null);

    const employeeId = clean(
      body?.employee_id,
    );

    const attendanceDate = clean(
      body?.attendance_date,
    );

    const manualCheckIn = clean(
      body?.manual_check_in,
    );

    const manualCheckOut = clean(
      body?.manual_check_out,
    );

    const reason = clean(
      body?.reason,
    );

    const requestedProofUrl = clean(
      body?.proof_url,
    );

    const requestedProofName = clean(
      body?.proof_name,
    );

    if (!employeeId || !isISODate(attendanceDate)) {
      return NextResponse.json(
        {
          success: false,
          error: "Employee atau tanggal absensi tidak valid.",
        },
        {
          status: 400,
        },
      );
    }

    if (attendanceDate > getTodayMakassar()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Absensi manual tidak dapat dibuat untuk tanggal yang akan datang.",
        },
        {
          status: 400,
        },
      );
    }

    if (!manualCheckIn && !manualCheckOut) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Minimal jam masuk atau jam pulang manual wajib diisi.",
        },
        {
          status: 400,
        },
      );
    }

    if (reason.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Keterangan absensi manual minimal 5 karakter.",
        },
        {
          status: 400,
        },
      );
    }

    const identity = await resolveIdentity(
      request,
      admin,
      employeeId,
    );

    if (!identity.ok) {
      return identity.response;
    }

    const employee = identity.employee;

    const machinePin = clean(
      employee.machine_pin,
    );

    const periodMonth =
      getPeriodMonthForDate(
        attendanceDate,
      );

    const periodRange =
      getPeriodRange(
        periodMonth,
      );

    if (!periodMonth || !periodRange) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Periode absensi tidak dapat ditentukan.",
        },
        {
          status: 400,
        },
      );
    }

    const [
      {
        data: confirmation,
      },
      {
        data: existing,
        error: existingError,
      },
    ] = await Promise.all([
      readPeriodConfirmation(
        admin,
        employeeId,
        periodMonth,
      ),

      readExistingLog(
        admin,
        machinePin,
        attendanceDate,
      ),
    ]);

    if (existingError) {
      return NextResponse.json(
        {
          success: false,
          error: existingError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (
      confirmation &&
      isPeriodReadOnly(confirmation)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Periode tanggal ini sudah masuk proses approval atau sudah dikunci. Hubungi HR jika perlu revisi.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      existing &&
      isRowReadOnly(existing)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Data tanggal ini sudah masuk proses approval/finalisasi dan tidak dapat diubah dari absensi manual.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Jika sebelumnya sudah ada bukti, bukti lama tidak dibuang
     * ketika employee mengubah jam manual.
     */
    const proofUrl =
      requestedProofUrl ||
      clean(existing?.absence_proof_url) ||
      clean(existing?.correction_proof_url);

    const proofName =
      requestedProofName ||
      clean(existing?.absence_proof_name) ||
      clean(existing?.correction_proof_name);

    if (!proofUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bukti pendukung wajib tersedia untuk absensi manual.",
        },
        {
          status: 400,
        },
      );
    }

    const now =
      new Date().toISOString();

    /*
     * Jika check_in/check_out sudah ada, berarti row tersebut
     * sudah memiliki data fingerprint/machine.
     *
     * Data mesin tidak boleh ditimpa dengan data manual.
     */
    const hasMachineData =
      Boolean(
        existing?.upload_id ||
          existing?.check_in ||
          existing?.check_out,
      );

    /*
     * Effective time hanya digunakan untuk menentukan ringkasan.
     * check_in/check_out fingerprint asli TIDAK ditimpa.
     */
    const effectiveCheckIn =
      clean(existing?.check_in) ||
      manualCheckIn;

    const effectiveCheckOut =
      clean(existing?.check_out) ||
      manualCheckOut;

    const updatePayload:
      Record<
        string,
        unknown
      > = {
      employee_id:
        employee.id,

      employee_number:
        employee.employee_number,

      machine_pin:
        machinePin,

      full_name:
        employee.full_name,

      department:
        employee.department,

      position:
        employee.position,

      attendance_date:
        attendanceDate,

      manual_check_in:
        manualCheckIn || null,

      manual_check_out:
        manualCheckOut || null,

      requested_check_in:
        manualCheckIn || null,

      requested_check_out:
        manualCheckOut || null,

      employee_daily_note:
        reason,

      correction_status:
        "draft_manual",

      correction_type:
        "live_manual_attendance",

      correction_reason:
        reason,

      correction_proof_url:
        proofUrl,

      correction_proof_name:
        proofName || null,

      correction_submitted_by:
        identity.authUser.email ||
        identity.appUser.email,

      correction_submitted_role:
        "employee",

      correction_submitted_at:
        now,

      correction_notes:
        appendNote(
          existing?.correction_notes,
          `Absensi manual employee disimpan untuk ${attendanceDate}. Approval tetap melalui Submit Periode.`,
        ),

      absence_request_type:
        "manual_attendance",

      absence_request_label:
        "Hadir Manual / Di Luar Kantor",

      absence_request_status:
        "draft",

      absence_request_source:
        "employee_live_manual",

      absence_proof_url:
        proofUrl,

      absence_proof_name:
        proofName || null,

      /*
       * manual_saved = data sudah persisten di DB,
       * tetapi belum merupakan submit periode ke atasan.
       */
      employee_confirmation_status:
        "manual_saved",

      employee_confirmed_at:
        null,

      employee_confirmation_batch_id:
        null,

      /*
       * Approval lama hanya dibersihkan karena di atas
       * sudah dipastikan row masih editable.
       */
      supervisor_approval_status:
        null,

      supervisor_approved_by:
        null,

      supervisor_approved_at:
        null,

      supervisor_reviewed_at:
        null,

      supervisor_reviewed_by:
        null,

      supervisor_note:
        null,

      hr_approval_status:
        null,

      hr_approved_by:
        null,

      hr_approved_at:
        null,

      hr_final_status:
        null,

      hr_finalized_at:
        null,

      hr_finalized_by:
        null,

      hr_note:
        null,

      is_phl_candidate:
        false,

      updated_at:
        now,
    };

    /*
     * Pure manual row:
     * status/source boleh mengikuti data manual.
     *
     * Existing fingerprint row:
     * source/status fingerprint tidak diambil alih.
     */
    if (!hasMachineData) {
      updatePayload.status =
        effectiveCheckIn &&
        effectiveCheckOut
          ? "present"
          : "incomplete";

      updatePayload.source =
        "employee_live_manual";
    }

    let saved: any = null;

    if (existing?.id) {
      const {
        data,
        error,
      } = await admin
        .from("attendance_logs")
        .update(updatePayload)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          {
            status: 500,
          },
        );
      }

      saved = data;
    } else {
      const {
        data,
        error,
      } = await admin
        .from("attendance_logs")
        .insert({
          ...updatePayload,

          /*
           * Tidak ada data fingerprint.
           */
          upload_id:
            null,

          check_in:
            null,

          check_out:
            null,

          total_punches:
            0,

          work_duration_minutes:
            null,

          status:
            effectiveCheckIn &&
            effectiveCheckOut
              ? "present"
              : "incomplete",

          source:
            "employee_live_manual",

          notes:
            "Absensi manual employee dari HARMONY.",

          created_at:
            now,

          deleted_at:
            null,

          deleted_by:
            null,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json(
          {
            success: false,
            error: error.message,
          },
          {
            status: 500,
          },
        );
      }

      saved = data;
    }

    return NextResponse.json(
      {
        success: true,

        attendance_log_id:
          saved?.id ||
          existing?.id ||
          null,

        attendance_date:
          attendanceDate,

        period_month:
          periodMonth,

        period_start:
          periodRange.start,

        period_end:
          periodRange.end,

        mode:
          existing
            ? "updated"
            : "inserted",

        has_machine_data:
          hasMachineData,

        proof_preserved:
          Boolean(proofUrl),

        summary_status:
          summaryStatus(
            effectiveCheckIn,
            effectiveCheckOut,
          ),

        message:
          "Absensi manual berhasil disimpan dan ringkasan kehadiran siap diperbarui.",
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Terjadi kesalahan saat menyimpan absensi manual.",
      },
      {
        status: 500,
      },
    );
  }
}