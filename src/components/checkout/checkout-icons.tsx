import type { CardBrand } from "@/lib/checkout/card-brand";

export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 18.5h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6.5 15h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M8 10.5V8a4 4 0 0 1 8 0v2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4.5 6.5v5c0 4.6 3.2 8.5 7.5 9.5 4.3-1 7.5-4.9 7.5-9.5v-5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9.5 12.2 11.2 14l3.5-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

export function CardBrandMark({ brand, className }: { brand: CardBrand; className?: string }) {
  if (brand === "visa") {
    return (
      <svg className={className} viewBox="0 0 48 16" aria-label="Visa" role="img">
        <text
          x="0"
          y="13"
          fill="currentColor"
          fontFamily="system-ui, sans-serif"
          fontSize="14"
          fontWeight="800"
          letterSpacing="0.5"
        >
          VISA
        </text>
      </svg>
    );
  }
  if (brand === "mastercard") {
    return (
      <svg className={className} viewBox="0 0 40 24" aria-label="Mastercard" role="img">
        <circle cx="15" cy="12" r="8" fill="#EB001B" />
        <circle cx="25" cy="12" r="8" fill="#F79E1B" />
        <path
          d="M20 6.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6Z"
          fill="#FF5F00"
        />
      </svg>
    );
  }
  if (brand === "amex") {
    return (
      <svg className={className} viewBox="0 0 48 16" aria-label="American Express" role="img">
        <rect width="48" height="16" rx="2" fill="#2E77BC" />
        <text
          x="24"
          y="11.5"
          textAnchor="middle"
          fill="#fff"
          fontFamily="system-ui, sans-serif"
          fontSize="7"
          fontWeight="700"
          letterSpacing="0.4"
        >
          AMEX
        </text>
      </svg>
    );
  }
  if (brand === "discover") {
    return (
      <svg className={className} viewBox="0 0 56 16" aria-label="Discover" role="img">
        <text
          x="0"
          y="12.5"
          fill="currentColor"
          fontFamily="system-ui, sans-serif"
          fontSize="10"
          fontWeight="700"
        >
          DISCOVER
        </text>
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
