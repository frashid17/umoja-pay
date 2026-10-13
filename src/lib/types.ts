export type MerchantStatus = "draft" | "pending_kyc" | "active" | "rejected" | "suspended";
export type MemberRole = "owner" | "developer";
export type KycStatus = "draft" | "pending" | "approved" | "rejected";
export type ApiKeyMode = "test" | "live";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled"
  | "partially_refunded"
  | "refunded";
export type PaymentMethod = "mpesa_stk" | "card";
export type CurrencyCode = "KES" | "TZS" | "UGX" | "RWF";
export type CountryCode = "KE" | "TZ" | "UG" | "RW";
export type SettlementStatus = "pending" | "processing" | "paid" | "failed";
export type CheckoutSessionStatus = "open" | "completed" | "expired" | "canceled";
export type PaymentLinkStatus = "active" | "archived";
export type RefundStatus = "pending" | "processing" | "succeeded" | "failed" | "canceled";
export type ProductStatus = "active" | "archived";
export type ProductFulfillment = "goods_services" | "digital" | "hybrid";
export type ProductPricingType = "single" | "pay_what_you_want" | "subscription" | "usage";
export type PriceInterval = "one_time" | "day" | "week" | "month" | "year";
export type InvoiceStatus = "draft" | "open" | "paid" | "void";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_amount: number;
};

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
  logo_path?: string | null;
  brand_accent?: string | null;
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
  phone: string | null;
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

export type CheckoutSession = {
  id: string;
  merchant_id: string;
  amount: number;
  currency: CurrencyCode;
  description: string | null;
  reference: string | null;
  status: CheckoutSessionStatus;
  mode: ApiKeyMode;
  is_preview: boolean;
  payment_id: string | null;
  success_url: string | null;
  cancel_url: string | null;
  metadata: Record<string, unknown>;
  expires_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentLink = {
  id: string;
  merchant_id: string;
  slug: string;
  product_name: string;
  description: string | null;
  amount: number;
  currency: CurrencyCode;
  image_path: string | null;
  mode: ApiKeyMode;
  status: PaymentLinkStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  merchant_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_path: string | null;
  fulfillment: ProductFulfillment;
  pricing_type: ProductPricingType;
  track_stock: boolean;
  stock_quantity: number | null;
  mode: ApiKeyMode;
  status: ProductStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProductPrice = {
  id: string;
  product_id: string;
  merchant_id: string;
  amount: number;
  currency: CurrencyCode;
  billing_interval: PriceInterval;
  nickname: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  merchant_id: string;
  slug: string;
  number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  currency: CurrencyCode;
  amount: number;
  line_items: InvoiceLineItem[];
  memo: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  mode: ApiKeyMode;
  payment_id: string | null;
  paid_at: string | null;
  metadata: Record<string, unknown>;
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

export type Refund = {
  id: string;
  merchant_id: string;
  payment_id: string;
  amount: number;
  currency: CurrencyCode;
  method: PaymentMethod;
  status: RefundStatus;
  mode: ApiKeyMode;
  reason: string | null;
  provider_ref: string | null;
  failure_reason: string | null;
  created_by: string | null;
  metadata: Record<string, unknown>;
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

export const PRICE_INTERVALS: { value: PriceInterval; label: string; short: string }[] = [
  { value: "one_time", label: "One-time", short: "once" },
  { value: "day", label: "Daily", short: "per day" },
  { value: "week", label: "Weekly", short: "per week" },
  { value: "month", label: "Monthly", short: "per month" },
  { value: "year", label: "Yearly", short: "per year" },
];

export const PRODUCT_FULFILLMENTS: {
  value: ProductFulfillment;
  label: string;
  description: string;
}[] = [
  {
    value: "goods_services",
    label: "Goods & services",
    description: "Products or services fulfilled outside the platform. Optional inventory tracking.",
  },
  {
    value: "digital",
    label: "Digital",
    description: "Downloadable files delivered after payment.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    description: "Goods or services plus downloadable files.",
  },
];

export const PRODUCT_PRICING_TYPES: {
  value: ProductPricingType;
  label: string;
  description: string;
}[] = [
  {
    value: "single",
    label: "Single payment",
    description: "One-time purchase with no recurring charges.",
  },
  {
    value: "pay_what_you_want",
    label: "Pay what you want",
    description: "Let customers choose their own price, ideal for donations and tips.",
  },
  {
    value: "subscription",
    label: "Subscription",
    description: "Recurring plans. Offer daily, monthly, or yearly prices customers can pick.",
  },
  {
    value: "usage",
    label: "Usage-based",
    description: "Charge based on usage or consumption.",
  },
];
