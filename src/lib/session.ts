import "server-only";

import { auth } from "@/lib/auth/server";
import { one, q } from "@/lib/db";
import type { Merchant, MerchantMember } from "@/lib/types";

export type AppUser = {
  id: string;
  email: string | undefined;
  name?: string | null;
};

export async function getSessionUser(): Promise<AppUser | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? undefined,
    name: session.user.name ?? null,
  };
}

export async function ensurePlatformAdmin(userId: string, email: string | undefined) {
  if (!email) return false;
  const allow = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!allow.includes(email.toLowerCase())) {
    const existing = one(
      await q<{ user_id: string }>`
        select user_id from platform_admins where user_id = ${userId}
      `,
    );
    return Boolean(existing);
  }

  await q`
    insert into platform_admins (user_id, email)
    values (${userId}, ${email.toLowerCase()})
    on conflict (user_id) do update set email = excluded.email
  `;
  return true;
}

export async function isPlatformAdmin(userId: string, email?: string | null) {
  return ensurePlatformAdmin(userId, email ?? undefined);
}

export async function getUserMerchant(userId: string): Promise<{
  merchant: Merchant;
  membership: MerchantMember;
} | null> {
  const membership = one(
    await q<MerchantMember>`
      select * from merchant_members
      where user_id = ${userId}
      order by created_at asc
      limit 1
    `,
  );
  if (!membership) return null;

  const merchant = one(
    await q<Merchant>`
      select * from merchants where id = ${membership.merchant_id}
    `,
  );
  if (!merchant) return null;

  return { merchant, membership };
}
