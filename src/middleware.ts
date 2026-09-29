// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WIP = [
  "/workshops", "/paths", "/pricing", "/for-teams",
  "/instructors", "/careers",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (WIP.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/coming-soon";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
