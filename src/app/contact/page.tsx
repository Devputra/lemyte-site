import type { Metadata } from "next";

import { LegalPage, Mail, Section } from "@/components/LegalPage";
import { fill, LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Contact Us | Lemyte" };

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact Us"
      intro={<p>We&apos;re happy to help with your account, payments, refunds or any question about the content.</p>}
    >
      <Section title="Support">
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2">
          <dt className="font-semibold text-zinc-950">Email</dt>
          <dd>
            <Mail />
          </dd>
          <dt className="font-semibold text-zinc-950">Phone</dt>
          <dd>
            <a href={`tel:${LEGAL.phone.replace(/\s/g, "")}`} className="underline underline-offset-2">
              {LEGAL.phone}
            </a>
          </dd>
          <dt className="font-semibold text-zinc-950">Hours</dt>
          <dd>{LEGAL.supportHours}</dd>
        </dl>
        <p>We reply to emails within 1 business day.</p>
      </Section>

      <Section title="Company">
        <p>
          <b className="text-zinc-950">{LEGAL.company}</b>
          <br />
          {fill(LEGAL.address, "Registered office address")}
        </p>
        <p className="text-sm text-zinc-500">
          CIN: {LEGAL.cin} · GSTIN: {LEGAL.gstin}
        </p>
      </Section>

      <Section title="Grievance Officer">
        <p>
          {fill(LEGAL.grievanceOfficer, "Grievance Officer name")} — <Mail />
        </p>
      </Section>
    </LegalPage>
  );
}
