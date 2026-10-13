import Link from "next/link";
import { notFound } from "next/navigation";
import { startInvoiceCheckout } from "@/app/invoice/actions";
import { LogoMark } from "@/components/brand/logo";
import { getMerchantForCheckout, merchantLogoPublicUrl } from "@/lib/checkout/sessions";
import {
  effectiveInvoiceStatus,
  formatInvoiceMoney,
  invoiceStatusLabel,
  invoiceStatusTone,
} from "@/lib/invoices/format";
import { getInvoiceBySlug } from "@/lib/invoices";

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const invoice = await getInvoiceBySlug(slug);
  if (!invoice) notFound();

  const merchant = await getMerchantForCheckout(invoice.merchant_id);
  if (!merchant) notFound();

  const logoUrl = merchantLogoPublicUrl(merchant.logo_path);
  const tone = effectiveInvoiceStatus(invoice);
  const canPay = invoice.status === "open";

  return (
    <div className="min-h-svh bg-atmosphere text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <LogoMark className="h-7 w-7" />
          )}
          <span className="font-display text-sm font-semibold">{merchant.name}</span>
        </div>
        <Link href="/" className="text-xs text-muted hover:text-foreground">
          Powered by Umoja Pay
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <article className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Invoice</p>
              <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">
                {invoice.number}
              </h1>
              <p className={`mt-2 text-sm font-medium ${invoiceStatusTone(tone)}`}>
                {invoiceStatusLabel(invoice)}
              </p>
            </div>
            <div className="text-right text-sm text-muted">
              {invoice.due_date ? <p>Due {invoice.due_date}</p> : null}
              <p className="mt-1 capitalize">{invoice.mode} mode</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Bill to</p>
              <p className="mt-2 font-medium text-foreground">{invoice.customer_name}</p>
              {invoice.customer_email ? (
                <p className="mt-1 text-sm text-muted">{invoice.customer_email}</p>
              ) : null}
              {invoice.customer_phone ? (
                <p className="text-sm text-muted">{invoice.customer_phone}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">From</p>
              <p className="mt-2 font-medium text-foreground">{merchant.name}</p>
              {merchant.support_email ? (
                <p className="mt-1 text-sm text-muted">{merchant.support_email}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[1fr_4rem_7rem] gap-3 border-b border-border bg-background px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted">
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Amount</span>
            </div>
            <ul className="divide-y divide-border">
              {invoice.line_items.map((item, index) => (
                <li
                  key={`${item.description}-${index}`}
                  className="grid grid-cols-[1fr_4rem_7rem] gap-3 px-4 py-3 text-sm"
                >
                  <span className="text-foreground">{item.description}</span>
                  <span className="text-right text-muted">{item.quantity}</span>
                  <span className="text-right text-foreground">
                    {formatInvoiceMoney(item.quantity * item.unit_amount, invoice.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border bg-background px-4 py-3">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="text-sm font-semibold text-foreground">
                {formatInvoiceMoney(invoice.amount, invoice.currency)}
              </span>
            </div>
          </div>

          {invoice.memo ? (
            <p className="mt-6 text-sm leading-relaxed text-muted">{invoice.memo}</p>
          ) : null}

          {canPay ? (
            <form action={startInvoiceCheckout} className="mt-8">
              <input type="hidden" name="slug" value={invoice.slug} />
              <button
                type="submit"
                className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
              >
                Pay {formatInvoiceMoney(invoice.amount, invoice.currency)}
              </button>
            </form>
          ) : invoice.status === "paid" ? (
            <p className="mt-8 rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
              This invoice has been paid
              {invoice.paid_at
                ? ` on ${new Date(invoice.paid_at).toLocaleDateString()}`
                : ""}
              .
            </p>
          ) : null}
        </article>
      </main>
    </div>
  );
}
