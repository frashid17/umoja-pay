"use client";

import { useState } from "react";

export function CodeBlock({ title, children }: { title?: string; children: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-sand">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="font-mono text-[11px] text-muted">{title ?? "Code"}</span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2 py-1 font-mono text-[11px] text-muted transition hover:bg-card hover:text-foreground"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto p-4 font-mono text-[12px] leading-6 break-words whitespace-pre-wrap text-foreground sm:whitespace-pre sm:break-normal">
        <code>{children}</code>
      </pre>
    </div>
  );
}
