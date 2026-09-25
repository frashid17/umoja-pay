"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelRefundAction,
  createRefundAction,
  updateRefundAction,
} from "@/app/dashboard/refunds/actions";
import { formatMoney } from "@/lib/merchant-finance";
import type { Payment, Refund } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent";

function majorDefault(minor: number) {
  return (minor / 100).toFixed(2);
}

export function CreateRefundForm({
  payment,
  remainingMinor,
}: {
  payment: Pick<Payment, "id" | "amount" | "currency" | "method" | "phone" | "metadata">;
  remainingMinor: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [full, setFull] = useState(true);

  const destination =
    payment.method === "card"
      ? `Card ••••${typeof payment.metadata?.card_last4 === "string" ? payment.metadata.card_last4 : "****"}`
      : `Mobile money ${payment.phone ?? ""}`;

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-sand/30 p-4"
      action={(fd) => {
        start(async () => {
          const res = await createRefundAction(fd);
          if (res.error) {
            setMsg(res.error);
            return;
          }
          setMsg("Refund submitted — settled to the original payment method");
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="paymentId" value={payment.id} />
      {full ? <input type="hidden" name="amount" value={majorDefault(remainingMinor)} /> : null}
      <p className="text-xs text-muted">
        Refund settles back to: <span className="font-medium text-foreground">{destination}</span>
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            checked={full}
            onChange={() => setFull(true)}
          />
          Full ({formatMoney(remainingMinor, payment.currency)})
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            checked={!full}
            onChange={() => setFull(false)}
          />
          Partial
        </label>
      </div>
      <label className="block space-y-1.5 text-sm">
        <span className="text-foreground">Amount</span>
        <input
          name={full ? undefined : "amount"}
          required={!full}
          inputMode="decimal"
          className={inputClass}
          defaultValue={majorDefault(remainingMinor)}
          key={full ? `full-${remainingMinor}` : "partial"}
          readOnly={full}
          disabled={full}
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="text-foreground">Reason (optional)</span>
        <input name="reason" placeholder="Customer requested refund" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending || remainingMinor < 1}
        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Refunding…" : "Issue refund"}
      </button>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </form>
  );
}

export function EditRefundForm({ refund }: { refund: Refund }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const canEditAmount = refund.status === "pending" || refund.status === "processing";

  return (
    <div className="space-y-3">
      <form
        className="space-y-3"
        action={(fd) => {
          start(async () => {
            const res = await updateRefundAction(fd);
            setMsg(res.error ?? (res.ok ? "Refund updated" : null));
            if (res.ok) router.refresh();
          });
        }}
      >
        <input type="hidden" name="refundId" value={refund.id} />
        {canEditAmount ? (
          <label className="block space-y-1.5 text-sm">
            <span className="text-foreground">Amount</span>
            <input
              name="amount"
              inputMode="decimal"
              defaultValue={majorDefault(refund.amount)}
              className={inputClass}
            />
          </label>
        ) : null}
        <label className="block space-y-1.5 text-sm">
          <span className="text-foreground">Reason</span>
          <input name="reason" defaultValue={refund.reason ?? ""} className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-accent/40 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      {refund.status !== "succeeded" && refund.status !== "canceled" ? (
        <form
          action={(fd) => {
            start(async () => {
              const res = await cancelRefundAction(fd);
              setMsg(res.error ?? (res.ok ? "Refund canceled" : null));
              if (res.ok) router.refresh();
            });
          }}
        >
          <input type="hidden" name="refundId" value={refund.id} />
          <button type="submit" disabled={pending} className="text-sm text-danger hover:underline">
            Cancel refund
          </button>
        </form>
      ) : null}
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </div>
  );
}
