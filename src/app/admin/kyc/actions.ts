"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, isPlatformAdmin } from "@/lib/session";
import { one, q } from "@/lib/db";
import type { KycSubmission } from "@/lib/types";

export async function reviewKycAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !(await isPlatformAdmin(user.id, user.email))) {
    throw new Error("Forbidden");
  }

  const submissionId = String(formData.get("submissionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "");

  if (!["approved", "rejected"].includes(decision)) {
    throw new Error("Invalid decision");
  }

  const submission = one(
    await q<KycSubmission>`select * from kyc_submissions where id = ${submissionId}`,
  );
  if (!submission) throw new Error("Submission not found");

  await q`
    update kyc_submissions
    set status = ${decision}::kyc_status,
        review_notes = ${notes || null},
        reviewed_by = ${user.id},
        reviewed_at = now()
    where id = ${submissionId}
  `;

  await q`
    update merchants
    set status = ${decision === "approved" ? "active" : "rejected"}::merchant_status,
        legal_name = ${submission.legal_name}
    where id = ${submission.merchant_id}
  `;

  await writeAuditLog({
    merchantId: submission.merchant_id,
    actorUserId: user.id,
    action: decision === "approved" ? "kyc.approved" : "kyc.rejected",
    entityType: "kyc_submission",
    entityId: submissionId,
    metadata: { notes },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/merchants");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/kyc");
}
