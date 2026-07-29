// src/app/verify/[token]/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import {
  getCertificateByToken,
  type CertificateRecord,
} from "@/lib/certificates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type RouteParams = {
  token: string;
};

// In Next 15, params is a Promise
type VerifyPageProps = {
  params: Promise<RouteParams>;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* --------- Metadata --------- */

export async function generateMetadata(
  props: VerifyPageProps,
): Promise<Metadata> {
  const { token } = await props.params;

  return {
    title: "Certificate Verification • Lemyte",
    description: `Verify a Lemyte certificate using token ${token}`,
  };
}

/* --------------------- Page UI --------------------- */

export default async function VerifyPage(props: VerifyPageProps) {
  const { token } = await props.params;

  const cert: CertificateRecord | null = await getCertificateByToken(token);

  /* --------- Not Found UI --------- */
  if (!cert) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-lg w-full border-red-200">
          <CardHeader className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <CardTitle>Certificate not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              We couldn&apos;t find a certificate for this verification link.
              The ID may be incorrect, expired, or revoked.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Lemyte
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isActive = cert.status === "valid";

  // NEW: badge + download URL + base verification URL
  const badgeSrc = `/badges/${cert.courseCode}.png`;
  const downloadHref = `/api/certificate/${cert.token}`;
  const verifyBase =
    process.env.NEXT_PUBLIC_BASE_URL ?? "https://lemyte.com";

  /* --------- Valid Certificate UI --------- */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Top bar */}
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-primary"
          >
            <img
              src="/Official_Logo.png"
              alt="Lemyte Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="text-[#193bc8]">Lemyte</span>
          </Link>

          <Button variant="outline" size="sm" asChild>
            <Link href="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to homepage
            </Link>
          </Button>
        </header>

        {/* Verification card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {isActive ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <CardTitle>Valid certificate</CardTitle>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                  <CardTitle>Certificate not active</CardTitle>
                </>
              )}
            </div>

            <div className="text-xs font-mono text-muted-foreground">
              ID:&nbsp;{cert.certificateId}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 text-sm">
            {/* NEW: Badge + core info */}
            <section className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full overflow-hidden border bg-white">
                <Image
                  src={badgeSrc}
                  alt={`${cert.courseName} badge`}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-muted-foreground uppercase">
                  Course
                </div>
                <div className="text-sm font-medium">
                  {cert.courseName}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({cert.courseCode})
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Issued to{" "}
                  <span className="font-semibold">{cert.learnerName}</span> on{" "}
                  {formatDate(cert.completedOn)}.
                </div>
              </div>
            </section>

            {/* Info Grid */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Learner
                </p>
                <p className="mt-1 text-base font-medium">{cert.learnerName}</p>
                {cert.learnerEmail && (
                  <p className="text-xs text-muted-foreground">
                    {cert.learnerEmail}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Course
                </p>
                <p className="mt-1 text-base font-medium">{cert.courseName}</p>
                <p className="text-xs text-muted-foreground">
                  Code: {cert.courseCode}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Date of completion
                </p>
                <p className="mt-1">{formatDate(cert.completedOn)}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Verification status
                </p>
                <p className="mt-1">
                  {isActive ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Verified • Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      Not active / Revoked
                    </span>
                  )}
                </p>
              </div>
            </section>

            {/* Footer + verification link + DOWNLOAD BUTTON */}
            <section className="border-t pt-4 mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
              <div className="space-y-1">
                <p>
                  This page confirms that the above learner has been issued a
                  certificate by Learnamyte for successfully completing the
                  mentioned course.
                </p>
                <p>
                  Issued by: <span className="font-medium">Learnamyte</span>
                </p>
                <p className="font-mono break-all">
                  Verification link:{" "}
                  {`${verifyBase}/verify/${cert.token}`}
                </p>
                <p>
                  If you suspect tampering, please contact{" "}
                  <a
                    href="mailto:team@lemyte.com"
                    className="underline hover:text-[#193BC8]"
                  >
                    team@lemyte.com
                  </a>
                  .
                </p>
              </div>

              <div className="sm:text-right">
                <Button asChild size="sm" className="mt-4 bg-black text-white hover:bg-[#193BC8]">
                  <a href={downloadHref}>
                    <Download className="mr-2 h-4 w-4 " />
                    Download certificate (PDF)
                  </a>
                </Button>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
