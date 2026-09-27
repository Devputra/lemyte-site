// src/lib/gate/errors.ts
// Shared error handling for GATE API routes.

import { z } from "zod";

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function isZodError(err: unknown): err is z.ZodError {
  return err instanceof z.ZodError;
}

export function handleRouteError(err: unknown, label: string): Response {
  if (isZodError(err)) {
    return Response.json(
      { error: "Invalid request body", details: err.issues },
      { status: 400 }
    );
  }

  console.error(`[${label}] error:`, err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
