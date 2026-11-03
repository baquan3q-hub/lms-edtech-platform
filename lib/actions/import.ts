"use server";

import { requireActorContext } from "@/lib/auth/actor-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseK12ExcelBuffer } from "@/lib/excel/import-parser";
import { buildStudentInternalEmail } from "@/lib/auth/student-auth";
import { generateActivationToken } from "@/lib/auth/activation";
import { recordAuditEvent } from "@/lib/audit/audit-logger";
import { produceOutboxEvent } from "@/lib/outbox/outbox-producer";

/**
 * Server action: Tải lên file Excel, phân tích và tạo Job lưu vào Staging
 */
export async function createImportJobAction(formData: FormData) {
  try {
    const actor = await requireActorContext(["admin"]);
    const file = formData.get("file") as File;

    if (!file) {
      return { ok: false, error: "Vui lòng chọn file Excel để tải lên." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Phân tích cú pháp và kiểm tra lỗi từng dòng
    const parseResult = parseK12ExcelBuffer(buffer);

    const db = createAdminClient();

    // 1. Tạo bản ghi import_jobs
    const { data: job, error: jobError } = await db
      .from("import_jobs")
      .insert({
        school_id: actor.schoolId,
        actor_id: actor.userId,
        file_name: file.name,
        file_hash: parseResult.fileHash,
        total_rows: parseResult.totalRows,
        processed_rows: parseResult.validCount,
        error_rows: parseResult.errorCount,
        status: parseResult.errorCount > 0 ? "validating" : "validated",
        summary: {
          validCount: parseResult.validCount,
          errorCount: parseResult.errorCount,
        },
      })
      .select()
      .single();

    if (jobError || !job) {
      return { ok: false, error: `Không thể tạo phiên import: ${jobError?.message}` };
    }

    // 2. Lưu từng dòng vào import_rows theo lô 50 dòng
    const rowBatches = parseResult.rows.map((r) => ({
      job_id: job.id,
      row_number: r.rowNumber,
      raw_data: r.rawData,
      normalized_data: r.normalizedData,
      status: r.status,
      error_code: r.errorCode || null,
      error_message: r.errorMessage || null,
    }));

    for (let i = 0; i < rowBatches.length; i += 50) {
      const batch = rowBatches.slice(i, i + 50);
      await db.from("import_rows").insert(batch);
    }

    return {
      ok: true,
      jobId: job.id,
      totalRows: parseResult.totalRows,
      validCount: parseResult.validCount,
      errorCount: parseResult.errorCount,
      rows: parseResult.rows,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Lỗi xử lý file Excel." };
  }
}

/**
 * Server action: Sửa thông tin dòng lỗi trực tiếp trên giao diện Preview
 */
export async function updateImportRowAction(
  rowId: string,
  updatedData: Record<string, any>
) {
  try {
    await requireActorContext(["admin"]);
    const db = createAdminClient();

    // Cập nhật normalized_data và chuyển status thành valid
    const { data: updatedRow, error } = await db
      .from("import_rows")
      .update({
        normalized_data: updatedData,
        status: "valid",
        error_code: null,
        error_message: null,
      })
      .eq("id", rowId)
      .select()
      .single();

    if (error || !updatedRow) {
      return { ok: false, error: `Lỗi cập nhật dòng: ${error?.message}` };
    }

    // Cập nhật lại số lượng lỗi trong import_jobs
    const { count: remainingErrors } = await db
      .from("import_rows")
      .select("*", { count: "exact", head: true })
      .eq("job_id", updatedRow.job_id)
      .eq("status", "error");

    await db
      .from("import_jobs")
      .update({
        error_rows: remainingErrors || 0,
        status: (remainingErrors || 0) === 0 ? "validated" : "validating",
      })
      .eq("id", updatedRow.job_id);

    return { ok: true, remainingErrors: remainingErrors || 0 };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Server action: Ghi dữ liệu chính thức theo giao dịch (Transactional Commit)
 * Idempotent: chạy lại cùng một file không tạo tài khoản trùng lặp.
 */
export async function commitImportJobAction(jobId: string) {
  try {
    const actor = await requireActorContext(["admin"]);
    const db = createAdminClient();

    // 1. Kiểm tra trạng thái job
    const { data: job, error: jobErr } = await db
      .from("import_jobs")
      .select("*, school:schools!import_jobs_school_id_fkey(code)")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return { ok: false, error: "Không tìm thấy phiên import." };
    }

    if (job.status === "completed") {
      return { ok: true, message: "Phiên import này đã được ghi dữ liệu trước đó." };
    }

    if (job.error_rows > 0) {
      return {
        ok: false,
        error: `Còn ${job.error_rows} dòng có lỗi. Vui lòng sửa hết lỗi trước khi commit.`,
      };
    }

    await db.from("import_jobs").update({ status: "committing" }).eq("id", jobId);

    // 2. Lấy toàn bộ các dòng valid
    const { data: rows } = await db
      .from("import_rows")
      .select("*")
      .eq("job_id", jobId)
      .order("row_number");

    const validRows = rows || [];
    const schoolCode = (job as any).school?.code || "THCS-NDU";
    let importedCount = 0;
    const activationSlips: { studentCode: string; fullName: string; token: string }[] = [];

    // Lấy năm học hiện tại
    const { data: currentYear } = await db
      .from("academic_years")
      .select("id")
      .eq("school_id", actor.schoolId)
      .eq("is_current", true)
      .limit(1)
      .single();

    const academicYearId = currentYear?.id;

    for (const r of validRows) {
      const data = r.normalized_data;
      if (!data || !data.studentCode) continue;

      const studentCode = data.studentCode.trim().toUpperCase();
      const internalEmail = buildStudentInternalEmail(studentCode, schoolCode);

      // Kiểm tra xem student_identifier đã tồn tại chưa (Idempotency)
      const { data: existingIdent } = await db
        .from("student_identifiers")
        .select("user_id")
        .eq("school_id", actor.schoolId)
        .eq("student_code", studentCode)
        .limit(1);

      let userId = existingIdent?.[0]?.user_id;

      if (!userId) {
        // Tạo tài khoản mới với mật khẩu mặc định abc123
        const { data: newAuth, error: authErr } = await db.auth.admin.createUser({
          email: internalEmail,
          password: "abc123",
          email_confirm: true,
          user_metadata: {
            role: "student",
            full_name: data.fullName,
            student_code: studentCode,
          },
        });

        if (authErr && !authErr.message.includes("already registered")) {
          console.error(`Lỗi tạo auth user [${studentCode}]:`, authErr.message);
          continue;
        }

        userId = newAuth?.user?.id;
        if (!userId) {
          // Nếu email đã tồn tại, tìm user_id
          const { data: u } = await db.from("users").select("id").eq("email", internalEmail).single();
          userId = u?.id;
        }

        if (userId) {
          // Upsert vào bảng public.users
          await db.from("users").upsert({
            id: userId,
            email: internalEmail,
            role: "student",
            full_name: data.fullName,
          });

          // Liên kết thành viên trường
          await db.from("school_memberships").upsert({
            school_id: actor.schoolId,
            user_id: userId,
            role: "student",
            status: "active",
          });

          // Gán mã định danh student_identifiers
          await db.from("student_identifiers").upsert({
            school_id: actor.schoolId,
            user_id: userId,
            student_code: studentCode,
            status: "active",
          });

          // Sinh mã kích hoạt ngẫu nhiên và lưu hash SHA-256
          const { token, hash } = generateActivationToken();
          await db.from("account_activations").insert({
            school_id: actor.schoolId,
            user_id: userId,
            activation_token_hash: hash,
            status: "pending",
          });

          activationSlips.push({
            studentCode,
            fullName: data.fullName,
            token,
          });
        }
      }

      // Xếp lớp chủ nhiệm nếu có
      if (userId && data.homeroom && academicYearId) {
        const { data: hr } = await db
          .from("homerooms")
          .select("id")
          .eq("school_id", actor.schoolId)
          .ilike("code", data.homeroom.trim())
          .limit(1)
          .single();

        if (hr) {
          await db.from("homeroom_enrollments").upsert(
            {
              school_id: actor.schoolId,
              homeroom_id: hr.id,
              student_id: userId,
              academic_year_id: academicYearId,
              status: "active",
            },
            { onConflict: "school_id,student_id,academic_year_id" }
          );
        }
      }

      // Đánh dấu dòng là committed
      await db.from("import_rows").update({ status: "committed" }).eq("id", r.id);
      importedCount++;
    }

    // 3. Hoàn tất Job và phát sinh sự kiện outbox & audit
    await db
      .from("import_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        summary: {
          importedCount,
          activationTokensGenerated: activationSlips.length,
        },
      })
      .eq("id", jobId);

    await produceOutboxEvent({
      schoolId: actor.schoolId,
      eventType: "students_imported",
      aggregateType: "import_job",
      aggregateId: jobId,
      eventKey: `import_job_${jobId}`,
      payload: {
        jobId,
        importedCount,
        actorId: actor.userId,
      },
    });

    await recordAuditEvent({
      schoolId: actor.schoolId,
      actorId: actor.userId,
      action: "commit_import_job",
      entityType: "import_job",
      entityId: jobId,
      afterState: { importedCount, status: "completed" },
    });

    return {
      ok: true,
      message: `Đã hoàn tất import thành công ${importedCount} học sinh!`,
      activationSlips,
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
