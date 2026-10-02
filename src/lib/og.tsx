// src/lib/og.tsx — the 1200×630 share card (WhatsApp, Telegram, LinkedIn, X, search previews).
// Plain brand layout: icon, a short eyebrow, the page title and up to three real numbers.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export async function ogImage({ eyebrow, title, stats = [] }: { eyebrow: string; title: string; stats?: [string, string][] }) {
  const icon = await readFile(path.join(process.cwd(), "src/app/icon.png"));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconSrc} width={64} height={64} alt="" />
          <span style={{ fontSize: 34, fontWeight: 600, color: "#0b0b0d" }}>Lemyte</span>
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 26, color: "#193bc8", fontWeight: 600 }}>{eyebrow}</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: title.length > 60 ? 54 : 64, lineHeight: 1.1, fontWeight: 600, color: "#0b0b0d", maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ display: "flex", marginTop: "auto", gap: 56 }}>
          {stats.map(([value, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 40, fontWeight: 600, color: "#0b0b0d" }}>{value}</span>
              <span style={{ fontSize: 22, color: "#52525b" }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 12, background: "#193bc8", display: "flex" }} />
      </div>
    ),
    OG_SIZE,
  );
}
