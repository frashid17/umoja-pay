import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/sign-in",
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/api/internal/:path*",
  ],
};
