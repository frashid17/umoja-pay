"use client";

import { useEffect, useState, useTransition } from "react";
import { signOutAction } from "@/app/auth/actions";
import { authClient } from "@/lib/auth/client";
import { gravatarUrl } from "@/lib/gravatar";

export function AccountMenu() {
  const { data: session } = authClient.useSession();
  const [pending, startTransition] = useTransition();
  const email = session?.user?.email ?? null;
  const label = email?.trim() || "Account";
  const initial = label.charAt(0).toUpperCase();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    void gravatarUrl(email, 64).then((url) => {
      if (!cancelled) setAvatarUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  return (
    <div className="relative flex items-center gap-2">
      <span
        className="hidden max-w-[10rem] truncate text-xs text-muted sm:inline"
        title={label}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card text-xs font-semibold text-foreground"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className="pointer-events-none h-full w-full select-none object-cover"
            draggable={false}
          />
        ) : (
          initial
        )}
      </span>
      <form
        action={() => {
          startTransition(async () => {
            await signOutAction();
          });
        }}
      >
        <button
          type="submit"
          disabled={pending}
          className="hidden text-xs text-muted transition hover:text-foreground disabled:opacity-60 sm:inline"
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      </form>
    </div>
  );
}
