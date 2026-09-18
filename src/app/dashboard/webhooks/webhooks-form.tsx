"use client";

import { useState, useTransition } from "react";
import { saveWebhookAction } from "@/app/dashboard/webhooks/actions";
import type { WebhookEndpoint } from "@/lib/types";

export function WebhooksForm({ endpoints }: { endpoints: WebhookEndpoint[] }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(formData: FormData) {
    setError(null);
    setSecret(null);
    startTransition(async () => {
      const result = await saveWebhookAction(formData);
      if (result.error) setError(result.error);
      else if (result.signingSecret) setSecret(result.signingSecret);
    });
  }

  return (
    <div className="space-y-8">
      <form action={onSave} className="max-w-lg space-y-3 rounded-lg border border-border bg-card p-5">
        <label className="block space-y-1 text-sm">
          <span>Endpoint URL</span>
          <input
            name="url"
            type="url"
            required
            placeholder="https://example.com/webhooks/umoja"
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Mode</span>
          <select name="mode" defaultValue="test" className="w-full rounded-md border border-border bg-background px-3 py-2">
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {secret ? (
          <div className="rounded-md border border-accent/40 bg-accent-soft p-3 text-sm">
            <p className="font-medium">Signing secret (store securely)</p>
            <code className="mt-2 block break-all font-mono text-xs">{secret}</code>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Save endpoint
        </button>
      </form>

      <ul className="space-y-3">
        {endpoints.map((ep) => (
          <li key={ep.id} className="rounded-lg border border-border bg-card p-4 text-sm">
            <p className="font-medium capitalize">{ep.mode}</p>
            <p className="mt-1 break-all text-muted">{ep.url}</p>
            <p className="mt-2 font-mono text-xs text-muted">{ep.signing_secret}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
