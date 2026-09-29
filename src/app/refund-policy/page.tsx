import type { Metadata } from "next";

import { LegalPage, List, Mail, Section } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Refund & Cancellation Policy | Lemyte" };

export default function RefundPolicyPage() {
  const days = LEGAL.refundWindowDays;
  const max = LEGAL.refundMaxAttempts;
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      intro={
        <p>
          We want you to buy a {LEGAL.brand} plan with confidence. Try the free demo first. If a paid plan isn&apos;t
          right for you, you can get a full refund within {days} days as long as you have barely used it.
        </p>
      }
    >
      <Section title={`1. ${days}-day refund`}>
        <p>You are eligible for a full refund if both of these are true:</p>
        <List
          items={[
            <>you request the refund within <b>{days} days</b> of the purchase date; and</>,
            <>you have started <b>no more than {max} tests</b> on the plan (practice tests, topic practice sessions or ranked mocks; the free demo does not count).</>,
          ]}
        />
      </Section>

      <Section title="2. Always refunded">
        <p>Whatever the timing or usage, we refund in full:</p>
        <List
          items={[
            "duplicate payments for the same plan;",
            "payments where money was debited but the plan was not activated, and we cannot activate it within 48 hours of your report.",
          ]}
        />
      </Section>

      <Section title="3. Not refundable">
        <List
          items={[
            `requests made more than ${days} days after purchase;`,
            `plans on which more than ${max} tests have been started;`,
            "plans suspended or terminated for breaking our Terms & Conditions (for example account sharing or copying content);",
            "partial refunds for the unused part of a plan's validity.",
          ]}
        />
      </Section>

      <Section title="4. How to request a refund">
        <p>
          Email <Mail /> from your registered email address with the subject &quot;Refund request&quot;, your order or
          payment ID (from the Razorpay receipt) and, optionally, the reason. We confirm eligibility within 2
          business days.
        </p>
      </Section>

      <Section title="5. How refunds are paid">
        <p>
          Approved refunds are issued through Razorpay to the original payment method within 5–7 business days of
          approval. Your bank or card issuer may take a few more days to show the credit. Access under the plan ends
          when the refund is issued.
        </p>
      </Section>

      <Section title="6. Cancellation">
        <p>
          Plans are one-time purchases and do not renew automatically, so there is no subscription to cancel. Your
          access simply ends when the plan&apos;s validity period ends. To stop using a plan early, follow the refund
          process above if you are eligible; otherwise access continues until expiry.
        </p>
      </Section>

      <Section title="7. Contact">
        <p>
          Questions about a payment or refund? Email <Mail /> or call {LEGAL.phone} ({LEGAL.supportHours}).
        </p>
      </Section>
    </LegalPage>
  );
}
