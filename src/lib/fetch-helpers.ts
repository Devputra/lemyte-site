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

// Keep the deadline active until the response body has also been read.
export async function fetchJson(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
