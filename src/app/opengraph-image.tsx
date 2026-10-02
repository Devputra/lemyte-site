// src/app/opengraph-image.tsx — default share card for every page without its own.
import { getCatalog } from "@/lib/gate/catalog.server";
import { fmtInt } from "@/lib/gate/catalog";
import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "Lemyte — official GATE past papers as timed tests";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 86400;

export default async function Image() {
  const { totals } = await getCatalog();
  return ogImage({
    eyebrow: "GATE practice tests",
    title: "Official GATE papers as timed tests, marked with the official key",
    stats: [
      [fmtInt(totals.papers), "official papers"],
      [fmtInt(totals.questions), "questions"],
      [String(totals.subjects), "subjects"],
    ],
  });
}
