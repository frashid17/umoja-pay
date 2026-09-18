"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth/session";

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

  const supabase = createServiceClient();
  const { data: submission, error } = await supabase
    .from("kyc_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (error || !submission) throw new Error("Submission not found");

  await supabase
    .from("kyc_submissions")
    .update({
      status: decision,
      review_notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  await supabase
    .from("merchants")
    .update({
      status: decision === "approved" ? "active" : "rejected",
      legal_name: submission.legal_name,
    })
    .eq("id", submission.merchant_id);

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
