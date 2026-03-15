// src/app/gate/layout.tsx
import { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "GATE Mock Tests — Learnamyte",
  description:
    "High-fidelity GATE CS/IT mock tests with real exam simulation, analytics, and solutions.",
};

export default function GateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Learnamyte
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <Link href="/gate" className="hover:text-[#00A86B] transition-colors">
              GATE Mocks
            </Link>
            <Link href="/gate/pricing" className="hover:text-[#00A86B] transition-colors">
              Pricing
            </Link>
            <Link href="/gate/demo" className="rounded bg-[#00A86B] px-3 py-1.5 text-white hover:bg-[#009060] transition-colors">
              Free Demo
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Disclaimer */}
      <div className="border-t bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
        Learnamyte is not affiliated with IITs, GATE organizing institutes, or TCS
        iON. &quot;GATE&quot; is used only to describe exam preparation.
      </div>

      {/* Footer */}
      <footer className="border-t bg-white px-4 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500">
          <span>&copy; {new Date().getFullYear()} Learnamyte (Dxoctagon Pvt Ltd). All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/gate" className="hover:underline">
              GATE Mocks
            </Link>
            <Link href="/gate/demo" className="hover:underline">
              Free Demo
            </Link>
            <Link href="/gate/pricing" className="hover:underline">
              Pricing
            </Link>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
