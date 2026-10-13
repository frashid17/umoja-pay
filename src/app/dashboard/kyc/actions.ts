"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, getUserMerchant } from "@/lib/session";
import { dbMessage, one, q } from "@/lib/db";
import { putObject } from "@/lib/storage";
import type { KycSubmission } from "@/lib/types";

export async function submitKyc(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");

  const ctx = await getUserMerchant(user.id);
  if (!ctx) throw new Error("No merchant");

  const legalName = String(formData.get("legalName") ?? "");
  const registrationNumber = String(formData.get("registrationNumber") ?? "");
  const addressLine = String(formData.get("addressLine") ?? "");
  const city = String(formData.get("city") ?? "");
  const country = String(formData.get("country") ?? ctx.merchant.country);
  const directorsSummary = String(formData.get("directorsSummary") ?? "");
  const file = formData.get("document");

  if (!legalName || !registrationNumber || !addressLine || !city || !directorsSummary) {
    throw new Error("Missing required KYC fields");
  }

  let submission: KycSubmission;
  try {
    const row = one(
      await q<KycSubmission>`
        insert into kyc_submissions (
          merchant_id, legal_name, registration_number, address_line, city, country,
          directors_summary, status, submitted_by
        )
        values (
          ${ctx.merchant.id},
          ${legalName},
          ${registrationNumber},
          ${addressLine},
          ${city},
          ${country}::country_code,
          ${directorsSummary},
          'pending',
          ${user.id}
        )
        returning *
      `,
    );
    if (!row) throw new Error("KYC submit failed");
    submission = row;
  } catch (error) {
    throw new Error(dbMessage(error));
  }

  if (file instanceof File && file.size > 0) {
    const path = `${ctx.merchant.id}/${submission.id}/${file.name}`;
    await putObject({
      bucket: "kyc",
      path,
      bytes: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });

    await q`
      insert into kyc_documents (
        merchant_id, submission_id, doc_type, file_path, file_name, content_type
      )
      values (
        ${ctx.merchant.id},
        ${submission.id},
        'registration_certificate',
        ${path},
        ${file.name},
        ${file.type || null}
      )
    `;
  }

  await q`
    update merchants
    set status = 'pending_kyc', legal_name = ${legalName}
    where id = ${ctx.merchant.id}
  `;

  await writeAuditLog({
    merchantId: ctx.merchant.id,
    actorUserId: user.id,
    action: "kyc.submitted",
    entityType: "kyc_submission",
    entityId: submission.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
}
