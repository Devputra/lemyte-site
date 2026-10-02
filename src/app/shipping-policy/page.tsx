import type { Metadata } from "next";

import { pageMeta } from "@/lib/seo";

import { LegalPage, List, Mail, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = pageMeta({
  title: "Delivery policy",
  description: "Lemyte plans are digital: access is added to your account as soon as payment is confirmed. Nothing is shipped.",
  path: "/shipping-policy",
});

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      title="Shipping & Delivery Policy"
      intro={
        <p>
          {LEGAL.brand} sells access to online services only. There are no physical goods, so nothing is shipped
          and there are no shipping charges.
        </p>
      }
    >
      <Section title="1. How your purchase is delivered">
        <List
          items={[
            "Plans are delivered digitally, as access to premium features on your registered Lemyte account.",
            "Access is activated automatically as soon as Razorpay confirms your payment, usually within a few minutes.",
            "A confirmation is shown on screen, and a receipt is sent to your registered email address.",
          ]}
        />
      </Section>

      <Section title="2. Validity">
        <p>
          The plan&apos;s validity period (for example 1, 3 or 6 months) starts when access is activated, and is shown on
          your dashboard.
        </p>
      </Section>

      <Section title="3. If access is not activated">
        <p>
          If your payment went through but access is not active within 24 hours, email <Mail /> with your
          registered email address and the payment ID. We will activate access or refund the payment in full, as
          described in our Refund &amp; Cancellation Policy.
        </p>
      </Section>
    </LegalPage>
  );
}
