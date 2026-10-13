"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export type AuthFormState = { error: string } | null;

export async function signInWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const { error } = await auth.signIn.email({ email, password });
  if (error) {
    return { error: error.message || "Could not sign in" };
  }

  redirect("/dashboard");
}

export async function signUpWithEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const name =
    String(formData.get("name") ?? "").trim() ||
    (email.includes("@") ? email.split("@")[0] : "Merchant");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const { error } = await auth.signUp.email({ email, password, name });
  if (error) {
    return { error: error.message || "Could not create account" };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/");
}
