import {
  DocsPageHeader,
  DocsPager,
  InlineCode,
  SimpleTable,
} from "@/components/docs/ui";

export default function MobileMoneyPage() {
  return (
    <div className="max-w-3xl">
      <DocsPageHeader
        eyebrow="Learn"
        title="What's mobile money?"
        lead="Mobile money is a wallet tied to a phone number. Customers authorize payments from their handset — there is no card network in the middle."
      />

      <div className="space-y-4 text-[15px] leading-relaxed text-muted">
        <p>
          In East Africa, most everyday digital payments run through mobile network operators
          (MNOs) such as Safaricom M-Pesa. Your customer already has a wallet on their SIM. When
          you charge them, the network prompts their phone for a PIN.
        </p>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">STK Push in practice</h2>
        <p>
          With <strong className="text-foreground">M-Pesa STK Push</strong>, your backend asks
          Umoja Pay to request a payment. The network pushes a prompt to the customer&apos;s phone.
          They enter their PIN. The network confirms success or failure. Umoja Pay updates the
          payment object and notifies your webhook.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Your server creates a payment with amount, currency, and MSISDN.</li>
          <li>The customer sees a PIN prompt on their phone.</li>
          <li>They approve or decline.</li>
          <li>
            You learn the terminal status via webhook or{" "}
            <InlineCode>GET /payments/:id</InlineCode>.
          </li>
        </ol>

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          Cards vs mobile money
        </h2>
        <SimpleTable
          headers={["Cards", "Mobile money (STK)"]}
          rows={[
            ["Card number + CVV (or token)", "Phone number + network PIN prompt"],
            ["Often feels synchronous", "Final status is usually asynchronous"],
            ["Chargebacks via card schemes", "Disputes via MNO / operator rules"],
            ["Global rails", "Country-specific providers"],
            ["PCI scope if you touch PANs", "Lower PCI surface if you only send MSISDN"],
          ]}
        />

        <h2 className="font-display pt-4 text-2xl font-bold text-foreground">
          What Umoja Pay abstracts
        </h2>
        <p>
          Provider quirks (short codes, callback formats, timeout behavior) differ by market. Your
          integration talks to one payment API. As Umoja Pay adds rails, your create/retrieve/webhook
          contract stays stable.
        </p>
        <SimpleTable
          headers={["MVP market", "Currency", "Method shape"]}
          rows={[
            ["Kenya (KE)", "KES", "mpesa_stk"],
            ["Tanzania (TZ)", "TZS", "mpesa_stk"],
            ["Uganda (UG)", "UGX", "mpesa_stk"],
            ["Rwanda (RW)", "RWF", "mpesa_stk"],
          ]}
        />
      </div>

      <DocsPager
        prev={{ href: "/docs", label: "Welcome" }}
        next={{ href: "/docs/what-to-know", label: "What you should know" }}
      />
    </div>
  );
}
