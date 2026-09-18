"use client";

import { useState, useTransition } from "react";
import { createApiKeyAction, revokeApiKeyAction } from "@/app/dashboard/keys/actions";
import type { ApiKey, MerchantStatus } from "@/lib/types";

export function ApiKeysManager({
  keys,
  merchantStatus,
}: {
  keys: Omit<ApiKey, "secret_hash">[];
  merchantStatus: MerchantStatus;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCreate(formData: FormData) {
    setError(null);
    setSecret(null);
    startTransition(async () => {
      const result = await createApiKeyAction(formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSecret(result.secret);
      }
    });
  }

  return (
    <div className="space-y-8">
      <form action={onCreate} className="max-w-lg space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-lg">Create API key</h2>
        <label className="block space-y-1 text-sm">
          <span>Name</span>
          <input
            name="name"
            defaultValue="Default"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Mode</span>
          <select name="mode" defaultValue="test" className="w-full rounded-md border border-border bg-background px-3 py-2">
            <option value="test">Test</option>
            <option value="live" disabled={merchantStatus !== "active"}>
              Live {merchantStatus !== "active" ? "(requires KYC)" : ""}
            </option>
          </select>
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {secret ? (
          <div className="rounded-md border border-accent/40 bg-accent-soft p-3 text-sm">
            <p className="font-medium">Copy this secret now — it will not be shown again.</p>
            <code className="mt-2 block break-all font-mono text-xs">{secret}</code>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Creating…" : "Generate key"}
        </button>
      </form>

      {keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-sm text-muted">
          No keys yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {keys.map((key) => (
            <li
              key={key.id}
              className="rounded-xl border border-border bg-card px-4 py-3.5 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{key.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted">{key.prefix}…</p>
                </div>
                {!key.revoked_at ? (
                  <form action={revokeApiKeyAction}>
                    <input type="hidden" name="keyId" value={key.id} />
                    <button type="submit" className="shrink-0 text-sm text-danger hover:underline">
                      Revoke
                    </button>
                  </form>
                ) : (
                  <span className="shrink-0 text-xs text-muted">Revoked</span>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div>
                  <dt className="text-muted">Mode</dt>
                  <dd className="mt-0.5 capitalize text-foreground">{key.mode}</dd>
                </div>
                <div>
                  <dt className="text-muted">Created</dt>
                  <dd className="mt-0.5 text-foreground">
                    {new Date(key.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
