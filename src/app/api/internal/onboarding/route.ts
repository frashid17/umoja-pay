import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { ensurePlatformAdmin, getSessionUser } from "@/lib/session";
import { dbMessage, one, q } from "@/lib/db";
import type { Merchant } from "@/lib/types";

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

  const existing = one(
    await q<{ id: string }>`
      select id from merchant_members where user_id = ${user.id}
    `,
  );
  if (existing) {
    return NextResponse.json({ ok: true, existing: true });
  }

  let merchant: Merchant;
  try {
    const row = one(
      await q<Merchant>`
        insert into merchants (name, country, status, support_email)
        values (
          ${body.data.businessName},
          ${body.data.country}::country_code,
          'draft',
          ${user.email ?? null}
        )
        returning *
      `,
    );
    if (!row) throw new Error("Failed");
    merchant = row;
  } catch (error) {
    return NextResponse.json(
      { error: { code: "create_failed", message: dbMessage(error) } },
      { status: 500 },
    );
  }

  try {
    await q`
      insert into merchant_members (merchant_id, user_id, role)
      values (${merchant.id}, ${user.id}, 'owner')
    `;
  } catch (error) {
    return NextResponse.json(
      { error: { code: "create_failed", message: dbMessage(error) } },
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
