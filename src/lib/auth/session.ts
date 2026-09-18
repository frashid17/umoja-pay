import { auth, currentUser } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Merchant, MerchantMember } from "@/lib/types";

export type AppUser = {
  id: string;
  email: string | undefined;
};

export async function getSessionUser(): Promise<AppUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    undefined;

  return { id: userId, email };
}

export async function ensurePlatformAdmin(userId: string, email: string | undefined) {
  if (!email) return false;
  const allow = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const supabase = createServiceClient();

  if (!allow.includes(email.toLowerCase())) {
    const { data } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  }

  await supabase.from("platform_admins").upsert({
    user_id: userId,
    email: email.toLowerCase(),
  });
  return true;
}

export async function isPlatformAdmin(userId: string, email?: string | null) {
  return ensurePlatformAdmin(userId, email ?? undefined);
}

export async function getUserMerchant(userId: string): Promise<{
  merchant: Merchant;
  membership: MerchantMember;
} | null> {
  const supabase = createServiceClient();
  const { data: membership } = await supabase
    .from("merchant_members")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", membership.merchant_id)
    .single();

  if (!merchant) return null;

  return {
    merchant: merchant as Merchant,
    membership: membership as MerchantMember,
  };
}
