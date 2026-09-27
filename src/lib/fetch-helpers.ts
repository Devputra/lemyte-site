// src/lib/fetch-helpers.ts
// Client-side fetch utility for safely parsing JSON responses.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeJson(res: Response): Promise<Record<string, any>> {
  try {
    return await res.json();
  } catch (err) {
    console.warn("[safeJson] Failed to parse response body:", err);
    return {};
  }
}
