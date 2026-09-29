// src/components/site/ChromeGate.tsx — hide the site header/footer on full-screen exam routes.
"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const FULLSCREEN = ["/gate/attempt/", "/gate/instructions"];

export function ChromeGate({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const path = usePathname() ?? "";
  if (FULLSCREEN.some((p) => path.startsWith(p))) return <>{children}</>;
  return (
    <>
      {header}
      {children}
      {footer}
    </>
  );
}
