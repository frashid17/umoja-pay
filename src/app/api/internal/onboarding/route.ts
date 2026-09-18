import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { ensurePlatformAdmin, getSessionUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/admin";

const schema = z.object({
  businessName: z.string().min(2).max(120),
  country: z.enum(["KE", "TZ", "UG", "RW"]),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not signed in" } },
      { status: 401 },
    );
  }

  await ensurePlatformAdmin(user.id, user.email);

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Invalid onboarding payload" } },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("merchant_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, existing: true });
  }

  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .insert({
      name: body.data.businessName,
      country: body.data.country,
      status: "draft",
      support_email: user.email ?? null,
    })
    .select("*")
    .single();

  if (merchantError || !merchant) {
    return NextResponse.json(
      { error: { code: "create_failed", message: merchantError?.message ?? "Failed" } },
      { status: 500 },
    );
  }

  const { error: memberError } = await supabase.from("merchant_members").insert({
    merchant_id: merchant.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return NextResponse.json(
      { error: { code: "create_failed", message: memberError.message } },
      { status: 500 },
    );
  }

  await writeAuditLog({
    merchantId: merchant.id,
    actorUserId: user.id,
    action: "merchant.created",
    entityType: "merchant",
    entityId: merchant.id,
    metadata: { name: merchant.name, country: merchant.country },
  });

  return NextResponse.json({ ok: true, merchant });
}
