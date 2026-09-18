"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  saveSettlementAccountAction,
  updateBusinessProfileAction,
} from "@/app/dashboard/settings/actions";
import type { Merchant, SettlementAccount } from "@/lib/types";
import { COUNTRIES, CURRENCIES } from "@/lib/types";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-accent";

export function SettingsForms({
  merchant,
  account,
  role,
  userEmail,
}: {
  merchant: Merchant;
  account: SettlementAccount | null;
  role: string;
  userEmail?: string;
}) {
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);
  const [pendingProfile, startProfile] = useTransition();
  const [pendingAccount, startAccount] = useTransition();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Business profile</h2>
        <p className="mt-1 text-sm text-muted">
          How your business appears on statements and support channels.
        </p>
        <form
          className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2"
          action={(fd) => {
            startProfile(async () => {
              const res = await updateBusinessProfileAction(fd);
              setProfileMsg(res.error ?? (res.ok ? "Saved" : null));
            });
          }}
        >
          <Field label="Display name">
            <input
              name="name"
              required
              defaultValue={merchant.name}
              className={inputClass}
            />
          </Field>
          <Field label="Legal name">
            <input
              name="legalName"
              defaultValue={merchant.legal_name ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Website">
            <input
              name="website"
              type="url"
              placeholder="https://"
              defaultValue={merchant.website ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Country">
            <select name="country" defaultValue={merchant.country} className={inputClass}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Support email">
            <input
              name="supportEmail"
              type="email"
              defaultValue={merchant.support_email ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Support phone">
            <input
              name="supportPhone"
              placeholder="2547…"
              defaultValue={merchant.support_phone ?? ""}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Statement email">
              <input
                name="statementEmail"
                type="email"
                placeholder="Where settlement notices are sent"
                defaultValue={merchant.statement_email ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={pendingProfile}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {pendingProfile ? "Saving…" : "Save profile"}
            </button>
            {profileMsg ? (
              <p className={`text-sm ${profileMsg === "Saved" ? "text-success" : "text-danger"}`}>
                {profileMsg}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Settlement destination</h2>
        <p className="mt-1 text-sm text-muted">
          Where live collections are paid out. Mobile money is optional alongside a bank account.
        </p>
        <form
          className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-2"
          action={(fd) => {
            startAccount(async () => {
              const res = await saveSettlementAccountAction(fd);
              setAccountMsg(res.error ?? (res.ok ? "Saved" : null));
            });
          }}
        >
          <Field label="Account name">
            <input
              name="accountName"
              required
              defaultValue={account?.account_name ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Bank name">
            <input
              name="bankName"
              required
              defaultValue={account?.bank_name ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Account number">
            <input
              name="accountNumber"
              required
              defaultValue={account?.account_number ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Branch / sort code">
            <input
              name="branchCode"
              defaultValue={account?.branch_code ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Mobile money (optional)">
            <input
              name="mobileMoneyPhone"
              placeholder="2547…"
              defaultValue={account?.mobile_money_phone ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Settlement currency">
            <select
              name="currency"
              defaultValue={account?.currency ?? "KES"}
              className={inputClass}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bank country">
            <select
              name="country"
              defaultValue={account?.country ?? merchant.country}
              className={inputClass}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={pendingAccount}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {pendingAccount ? "Saving…" : "Save destination"}
            </button>
            {accountMsg ? (
              <p className={`text-sm ${accountMsg === "Saved" ? "text-success" : "text-danger"}`}>
                {accountMsg}
              </p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Team & access</h2>
        <p className="mt-1 text-sm text-muted">
          Your Clerk account is the owner identity for this merchant. Invite more seats in a later
          release.
        </p>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">Signed-in email</dt>
            <dd className="mt-1 font-medium text-foreground">{userEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">Role</dt>
            <dd className="mt-1 font-medium capitalize text-foreground">{role}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">Merchant ID</dt>
            <dd className="mt-1 font-mono text-xs text-foreground">{merchant.id}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">Account status</dt>
            <dd className="mt-1 font-medium capitalize text-foreground">
              {merchant.status.replaceAll("_", " ")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Related setup</h2>
        <ul className="mt-4 divide-y divide-border text-sm">
          {[
            {
              href: "/dashboard/kyc",
              title: "KYC & compliance",
              body: "Business documents for live mode",
            },
            {
              href: "/dashboard/keys",
              title: "API keys",
              body: "Test and live secrets",
            },
            {
              href: "/dashboard/webhooks",
              title: "Webhooks",
              body: "Signed payment event delivery",
            },
            {
              href: "/dashboard/settlements",
              title: "Settlements",
              body: "Payout history and pending balance",
            },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-baseline justify-between gap-4 py-3 transition hover:text-accent"
              >
                <span>
                  <span className="font-medium text-foreground">{item.title}</span>
                  <span className="mt-0.5 block text-muted">{item.body}</span>
                </span>
                <span className="shrink-0 text-muted" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:p-6">
        <h2 className="font-display text-xl font-bold text-foreground">Need help?</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          To close the merchant, change ownership, or dispute a settlement, email{" "}
          <a className="text-accent hover:underline" href="mailto:support@umojapay.com">
            support@umojapay.com
          </a>{" "}
          from your statement email. We keep audit logs for three years.
        </p>
      </section>
    </div>
  );
}
