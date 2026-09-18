/**
 * Umoja Pay mark — two linked figures forming a U
 * (deep + mint, signal head). Matched to brand sheet.
 * Theme tokens keep the left figure visible on dark UI.
 */
export const brand = {
  deep: "#0B3D32",
  mint: "#2DB887",
  signal: "#F0A202",
  ink: "#0D1512",
} as const;

type LogoProps = {
  className?: string;
  variant?: "mark" | "horizontal" | "stacked";
  tone?: "colored" | "mono";
};

export function LogoMark({
  className = "h-8 w-8",
  tone = "colored",
}: {
  className?: string;
  tone?: "colored" | "mono";
}) {
  const deep = tone === "mono" ? "currentColor" : "var(--brand-mark-deep)";
  const mint = tone === "mono" ? "currentColor" : "var(--brand-mark-mint)";
  const signal = tone === "mono" ? "currentColor" : "var(--brand-mark-signal)";

  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 30v12c0 6.5 5.5 12 14 12"
        stroke={deep}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M46 30v12c0 6.5-5.5 12-14 12"
        stroke={mint}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="11.5" r="6.75" fill={deep} />
      <circle cx="46" cy="11.5" r="6.75" fill={signal} />
    </svg>
  );
}

export function Logo({
  className = "",
  variant = "horizontal",
  tone = "colored",
}: LogoProps) {
  const wordUmoja = tone === "mono" ? "text-current" : "text-foreground";
  const wordPay = tone === "mono" ? "text-current opacity-80" : "text-accent";

  if (variant === "mark") {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <LogoMark className="h-8 w-8" tone={tone} />
        <span className="sr-only">Umoja Pay</span>
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-center gap-2 ${className}`}>
        <LogoMark className="h-10 w-10" tone={tone} />
        <span className="font-display text-center text-xl font-bold leading-none tracking-tight">
          <span className={wordUmoja}>Umoja</span>{" "}
          <span className={wordPay}>Pay</span>
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 sm:gap-2.5 ${className}`}>
      <LogoMark className="h-7 w-7 sm:h-8 sm:w-8" tone={tone} />
      <span className="font-display truncate text-lg font-bold leading-none tracking-tight sm:text-xl md:text-2xl">
        <span className={wordUmoja}>Umoja</span>{" "}
        <span className={wordPay}>Pay</span>
      </span>
    </span>
  );
}
