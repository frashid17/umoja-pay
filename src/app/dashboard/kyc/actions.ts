"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { getSessionUser, getUserMerchant } from "@/lib/auth/session";

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

  const supabase = createServiceClient();

  const { data: submission, error } = await supabase
    .from("kyc_submissions")
    .insert({
      merchant_id: ctx.merchant.id,
      legal_name: legalName,
      registration_number: registrationNumber,
      address_line: addressLine,
      city,
      country,
      directors_summary: directorsSummary,
      status: "pending",
      submitted_by: user.id,
    })
    .select("*")
    .single();

  if (error || !submission) throw new Error(error?.message ?? "KYC submit failed");

  if (file instanceof File && file.size > 0) {
    const path = `${ctx.merchant.id}/${submission.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("kyc").upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });
    if (uploadError) throw new Error(uploadError.message);

    await supabase.from("kyc_documents").insert({
      merchant_id: ctx.merchant.id,
      submission_id: submission.id,
      doc_type: "registration_certificate",
      file_path: path,
      file_name: file.name,
      content_type: file.type || null,
    });
  }

  await supabase
    .from("merchants")
    .update({ status: "pending_kyc", legal_name: legalName })
    .eq("id", ctx.merchant.id);

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
