import Link from "next/link";

export { CodeBlock } from "@/components/docs/code-block";

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-sand px-1.5 py-0.5 font-mono text-[13px] text-foreground">
      {children}
    </code>
  );
}

export function DocCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-border bg-card p-5 transition hover:border-accent/40 hover:bg-accent-soft/30"
    >
      <p className="font-display text-base font-semibold text-foreground group-hover:text-accent">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
    </Link>
  );
}

export function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-5 rounded-xl border border-border">
      {/* Mobile: stacked rows — no sideways scroll */}
      <ul className="divide-y divide-border sm:hidden">
        {rows.map((row) => (
          <li key={row.join("-")} className="space-y-2.5 px-4 py-3.5 text-sm">
            {row.map((cell, i) => (
              <div key={`${row[0]}-${headers[i]}`} className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                  {headers[i]}
                </p>
                <p
                  className={`mt-0.5 break-words ${
                    i === 0 ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {cell}
                </p>
              </div>
            ))}
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <table className="hidden w-full table-fixed text-left text-sm sm:table">
        <thead className="bg-sand/80 text-muted">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")} className="border-t border-border">
              {row.map((cell, i) => (
                <td
                  key={`${row[0]}-${i}`}
                  className={`break-words px-4 py-3 align-top ${
                    i === 0 ? "font-medium text-foreground" : "text-muted"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocsPageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow?: string;
  title: string;
  lead: string;
}) {
  return (
    <header className="mb-10 max-w-2xl">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{lead}</p>
    </header>
  );
}

export function DocsPager({
  prev,
  next,
}: {
  prev?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  return (
    <div className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="rounded-xl border border-border bg-card px-4 py-4 transition hover:border-accent/40"
        >
          <p className="text-xs text-muted">Previous</p>
          <p className="mt-1 font-medium text-foreground">{prev.label}</p>
        </Link>
      ) : (
        <div />
      )}
      {next ? (
        <Link
          href={next.href}
          className="rounded-xl border border-border bg-card px-4 py-4 text-right transition hover:border-accent/40"
        >
          <p className="text-xs text-muted">Next</p>
          <p className="mt-1 font-medium text-foreground">{next.label}</p>
        </Link>
      ) : null}
    </div>
  );
}

export function MethodBadge({ method }: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" }) {
  const tones: Record<string, string> = {
    GET: "bg-[#1d4ed8]/15 text-[#1d4ed8] ring-[#1d4ed8]/25 dark:text-[#60a5fa]",
    POST: "bg-success/15 text-success ring-success/30",
    PUT: "bg-warning/15 text-warning ring-warning/30",
    PATCH: "bg-warning/15 text-warning ring-warning/30",
    DELETE: "bg-danger/15 text-danger ring-danger/30",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide ring-1 ${tones[method]}`}
    >
      {method}
    </span>
  );
}

export function EndpointPath({
  method,
  path,
}: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <MethodBadge method={method} />
      <code className="font-mono text-sm text-foreground">{path}</code>
    </div>
  );
}

export const docsNav = [
  {
    title: "Learn",
    items: [
      { href: "/docs", label: "Welcome", exact: true },
      { href: "/docs/mobile-money", label: "Mobile money" },
      { href: "/docs/what-to-know", label: "What you should know" },
    ],
  },
  {
    title: "Start building",
    items: [
      { href: "/docs/how-to-start", label: "How to start" },
      { href: "/docs/authentication", label: "Authentication" },
      { href: "/docs/going-live", label: "Going live" },
    ],
  },
  {
    title: "Guides",
    items: [
      { href: "/docs/payments", label: "Collect a payment" },
      { href: "/docs/statuses", label: "Payment statuses" },
      { href: "/docs/webhooks", label: "Webhooks" },
      { href: "/docs/sandbox", label: "Sandbox testing" },
      { href: "/docs/errors", label: "Errors & codes" },
    ],
  },
  {
    title: "API reference",
    items: [
      { href: "/docs/reference", label: "Overview", exact: true },
      { href: "/docs/reference/create-payment", label: "Create a payment" },
      { href: "/docs/reference/list-payments", label: "List payments" },
      { href: "/docs/reference/retrieve-payment", label: "Retrieve a payment" },
    ],
  },
  {
    title: "Models",
    items: [
      { href: "/docs/reference/payment", label: "Payment" },
      { href: "/docs/reference/create-payment-request", label: "CreatePaymentRequest" },
      { href: "/docs/reference/error", label: "Error" },
    ],
  },
] as const;
