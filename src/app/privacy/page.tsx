import type { Metadata } from "next";

import { LegalPage, List, Mail, Section } from "@/components/LegalPage";
import { fill, LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy | Lemyte" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This Privacy Policy explains how {LEGAL.company} (&quot;we&quot;, &quot;us&quot;) collects, uses and protects your
          personal data when you use {LEGAL.brand} ({LEGAL.website}). We process personal data in line with the
          Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and its rules.
        </p>
      }
    >
      <Section title="1. Data we collect">
        <List
          items={[
            <><b>Account data:</b> your email address and password. Passwords are stored in hashed form by our authentication provider; we cannot read them.</>,
            <><b>Learning data:</b> tests and questions you attempt, your answers, time taken, scores, ranks and reports.</>,
            <><b>Payment data:</b> plan purchased, amount, order and payment IDs and payment status. Card, UPI and bank details are collected and processed by Razorpay, not by us.</>,
            <><b>Communications:</b> emails you send us, issue reports, and newsletter subscriptions.</>,
            <><b>Technical data:</b> IP address, browser and device information and server logs, plus cookies needed to keep you signed in.</>,
          ]}
        />
      </Section>

      <Section title="2. How we use your data">
        <List
          items={[
            "to create and secure your account and let you sign in;",
            "to provide tests, practice, scores, ranks and performance reports;",
            "to process payments, activate plans and handle refunds;",
            "to send service emails (verification, receipts, important updates) and, if you subscribe, newsletters;",
            "to fix errors, prevent fraud and misuse, and improve the Services;",
            "to meet legal, tax and accounting obligations.",
          ]}
        />
        <p>
          We process your data on the basis of your consent, given when you register or use the Services, and for
          the legitimate uses permitted by law. We do not sell your personal data.
        </p>
      </Section>

      <Section title="3. Who we share it with">
        <p>
          We share data only with service providers that help us run {LEGAL.brand}, and only as needed for their
          service:
        </p>
        <List
          items={[
            "Supabase: database and authentication;",
            "Vercel: website hosting;",
            "Amazon Web Services: storage of question images and media;",
            "Razorpay: payment processing;",
            "Zoho: transactional email;",
            "Mailchimp: newsletter emails (only if you subscribe).",
          ]}
        />
        <p>
          Some of these providers may store or process data outside India, with appropriate safeguards. We may also
          disclose data when required by law or to protect our rights and users.
        </p>
      </Section>

      <Section title="4. Cookies">
        <p>
          We use essential cookies to keep you signed in and to secure your session. We do not use advertising
          cookies. You can block cookies in your browser, but signing in will then not work.
        </p>
      </Section>

      <Section title="5. How long we keep data">
        <p>
          We keep account and learning data while your account is active. When you ask us to delete your account,
          we delete or anonymise your personal data within 30 days, except records we must keep by law (for
          example, payment and tax records, usually for 8 years).
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          We use encryption in transit (HTTPS), access controls and reputable infrastructure providers to protect
          your data. No system is perfectly secure; if a breach affects your data, we will notify you and the
          authorities as required by law.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>You can:</p>
        <List
          items={[
            "ask for a summary of the personal data we hold about you and how it is used;",
            "ask us to correct, complete or update your data;",
            "ask us to delete your data and account;",
            "withdraw consent at any time (this may stop parts of the Services from working);",
            "nominate a person to exercise these rights on your behalf in case of death or incapacity;",
            "raise a grievance with our Grievance Officer, and if unresolved, with the Data Protection Board of India.",
          ]}
        />
        <p>
          To use these rights, email <Mail /> from your registered email address. We respond within 30 days.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          The Services are meant for users aged 18 and above. If you are under 18, you may use them only with the
          verifiable consent of a parent or guardian. We do not knowingly track or target minors with advertising.
        </p>
      </Section>

      <Section title="9. Grievance Officer">
        <p>
          {fill(LEGAL.grievanceOfficer, "Grievance Officer name")}, {LEGAL.company},{" "}
          {fill(LEGAL.address, "Registered office address")}. Email: <Mail />, phone: {LEGAL.phone}.{" "}
          {LEGAL.supportHours}.
        </p>
      </Section>

      <Section title="10. Changes to this policy">
        <p>
          We may update this policy from time to time. The effective date above shows the latest version, and we
          will notify you of significant changes by email or on the website.
        </p>
      </Section>
    </LegalPage>
  );
}
