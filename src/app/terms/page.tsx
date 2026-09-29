import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, List, Mail, Section } from "@/components/LegalPage";
import { fill, LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms & Conditions | Lemyte" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={
        <p>
          These Terms &amp; Conditions (&quot;Terms&quot;) govern your use of {LEGAL.brand} ({LEGAL.website}) and its
          services, operated by {LEGAL.company} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By creating an account,
          purchasing a plan or using the website, you agree to these Terms. If you do not agree, please do not use
          the services.
        </p>
      }
    >
      <Section title="1. The service">
        <p>
          {LEGAL.brand} is an online assessment and practice platform for competitive examinations such as GATE. It
          offers previous-year questions (PYQs), topic-wise practice, practice tests, ranked mock tests, scores,
          solutions and performance reports (together, the &quot;Services&quot;).
        </p>
        <p>
          {LEGAL.brand} is an independent platform. It is not affiliated with, endorsed by or connected to IISc,
          the IITs, the GATE organising institutes or any examination authority. &quot;GATE&quot; is used only to
          describe the examination the content relates to.
        </p>
      </Section>

      <Section title="2. Eligibility and your account">
        <List
          items={[
            "You must be at least 18 years old, or use the Services with the consent and supervision of a parent or legal guardian.",
            "You must give accurate information when you register and keep your login credentials confidential.",
            "An account is for one person only. Sharing, selling or transferring an account or its access is not allowed.",
            "You are responsible for all activity on your account. Tell us immediately at the contact below if you suspect unauthorised use.",
          ]}
        />
      </Section>

      <Section title="3. Plans, prices and payment">
        <List
          items={[
            "Paid plans give access to premium features for the validity period shown at purchase (for example 1, 3 or 6 months).",
            "Plans are one-time purchases. They do not renew automatically, and you will not be charged again unless you buy a new plan.",
            "Prices are shown in Indian Rupees (INR) and include applicable taxes unless stated otherwise.",
            "Payments are processed by Razorpay using the payment methods it offers (UPI, cards, net banking, wallets). We do not see or store your card or bank details.",
            "Access is activated on your account after the payment is successfully verified. See our Shipping & Delivery Policy.",
            "We may change prices or plan features for future purchases. Changes do not affect a plan you have already bought.",
          ]}
        />
      </Section>

      <Section title="4. Refunds and cancellation">
        <p>
          Refunds are governed by our{" "}
          <Link href="/refund-policy" className="font-semibold underline underline-offset-2">
            Refund &amp; Cancellation Policy
          </Link>
          , which forms part of these Terms.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "copy, download in bulk, scrape, republish, sell or distribute questions, solutions, reports or other content from the Services;",
            "share your account, or use automated tools, bots or scripts to access the Services;",
            "use unfair means in ranked mock tests, or attempt to manipulate scores, ranks or leaderboards;",
            "interfere with the security or operation of the website, or try to access other users' accounts or data;",
            "use the Services for any unlawful purpose.",
          ]}
        />
        <p>
          We may suspend or terminate accounts that break these rules. A plan cancelled for misuse is not
          eligible for a refund.
        </p>
      </Section>

      <Section title="6. Content and intellectual property">
        <p>
          Previous-year questions are reproduced from official GATE question papers and answer keys for
          educational practice. Solutions, explanations, topic classification, reports, software, design and
          branding on {LEGAL.brand} belong to {LEGAL.company} or its licensors. You receive a personal,
          non-exclusive, non-transferable right to use the Services for your own preparation during your plan&apos;s
          validity.
        </p>
      </Section>

      <Section title="7. Accuracy, scores and results">
        <List
          items={[
            "Answers follow the official answer keys wherever available. Despite careful checking, questions, solutions or figures may contain errors. Please report them to us so we can fix them.",
            "Scores, ranks and predictions are indicative estimates for practice. They do not represent or guarantee your actual examination score, rank or admission.",
            "We do not guarantee any particular examination result.",
          ]}
        />
      </Section>

      <Section title="8. Availability">
        <p>
          We aim to keep the Services available at all times but do not guarantee uninterrupted access.
          Maintenance, updates or events outside our control may cause interruptions. We may add, change or remove
          features to improve the Services.
        </p>
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          The Services are provided &quot;as is&quot;. To the maximum extent permitted by law, {LEGAL.company} is not
          liable for indirect, incidental or consequential losses arising from your use of the Services. Our total
          liability for any claim is limited to the amount you paid us in the 12 months before the claim.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You may stop using the Services at any time. We may suspend or terminate your access if you break these
          Terms or if required by law. Sections on intellectual property, liability and governing law survive
          termination.
        </p>
      </Section>

      <Section title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. The effective date above shows the latest version.
          Continuing to use the Services after an update means you accept the revised Terms.
        </p>
      </Section>

      <Section title="12. Governing law">
        <p>
          These Terms are governed by the laws of India. Courts at {fill(LEGAL.jurisdictionCity, "City")}, India
          have exclusive jurisdiction over any dispute arising from them.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          {LEGAL.company}, {fill(LEGAL.address, "Registered office address")}. Email: <Mail />, phone:{" "}
          {LEGAL.phone}.
        </p>
      </Section>
    </LegalPage>
  );
}
