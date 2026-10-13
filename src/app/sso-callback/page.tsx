import { redirect } from "next/navigation";

/** OAuth callbacks are handled by `/api/auth/*`; keep this path as a soft landing. */
export default function SSOCallbackPage() {
  redirect("/dashboard");
}
