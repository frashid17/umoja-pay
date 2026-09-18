export type MerchantStatus = "draft" | "pending_kyc" | "active" | "rejected" | "suspended";
export type MemberRole = "owner" | "developer";
export type KycStatus = "draft" | "pending" | "approved" | "rejected";
export type ApiKeyMode = "test" | "live";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "canceled";
export type PaymentMethod = "mpesa_stk";
export type CurrencyCode = "KES" | "TZS" | "UGX" | "RWF";
export type CountryCode = "KE" | "TZ" | "UG" | "RW";
export type SettlementStatus = "pending" | "processing" | "paid" | "failed";

export type Merchant = {
  id: string;
  name: string;
  legal_name: string | null;
  country: CountryCode;
  status: MerchantStatus;
  website: string | null;
  support_email: string | null;
  support_phone?: string | null;
  statement_email?: string | null;
  created_at: string;
  updated_at: string;
};

export type MerchantMember = {
  id: string;
  merchant_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
};

export type KycSubmission = {
  id: string;
  merchant_id: string;
  legal_name: string;
  registration_number: string;
  address_line: string;
  city: string;
  country: CountryCode;
  directors_summary: string;
  status: KycStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_by: string;
  created_at: string;
  updated_at: string;
};

export type KycDocument = {
  id: string;
  merchant_id: string;
  submission_id: string;
  doc_type: string;
  file_path: string;
  file_name: string;
  content_type: string | null;
  created_at: string;
};

export type ApiKey = {
  id: string;
  merchant_id: string;
  name: string;
  prefix: string;
  secret_hash: string;
  mode: ApiKeyMode;
  last_used_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  merchant_id: string;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  phone: string;
  status: PaymentStatus;
  mode: ApiKeyMode;
  reference: string | null;
  metadata: Record<string, unknown>;
  provider_ref: string | null;
  failure_reason: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

export type WebhookEndpoint = {
  id: string;
  merchant_id: string;
  url: string;
  mode: ApiKeyMode;
  signing_secret: string;
  enabled: boolean;
  created_at: string;
};

export type SettlementAccount = {
  id: string;
  merchant_id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  branch_code: string | null;
  mobile_money_phone: string | null;
  currency: CurrencyCode;
  country: CountryCode;
  created_at: string;
  updated_at: string;
};

export type Settlement = {
  id: string;
  merchant_id: string;
  amount: number;
  currency: CurrencyCode;
  status: SettlementStatus;
  period_start: string;
  period_end: string;
  destination_label: string | null;
  reference: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: "KE", label: "Kenya" },
  { code: "TZ", label: "Tanzania" },
  { code: "UG", label: "Uganda" },
  { code: "RW", label: "Rwanda" },
];

export const CURRENCIES: CurrencyCode[] = ["KES", "TZS", "UGX", "RWF"];
