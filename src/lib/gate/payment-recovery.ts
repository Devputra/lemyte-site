import { fetchJson } from "@/lib/fetch-helpers";

type Access = { accessUntil?: string | null };

// Did this payment add access? Compares the last day of access (across current and queued plans) before and after,
// so it also works when the new plan is queued after one that is still running. A plan that existed before the
// payment is not evidence that the payment worked.
export function accessAdvanced(previousUntil: string | null, access: Access): boolean {
  if (!access.accessUntil) return false;
  if (!previousUntil) return new Date(access.accessUntil).getTime() > Date.now();
  return new Date(access.accessUntil).getTime() > new Date(previousUntil).getTime();
}

/** One look at access: true if it has moved past `previousUntil`. */
export async function accessArrived(previousUntil: string | null): Promise<boolean> {
  try {
    return accessAdvanced(previousUntil, await fetchJson("/api/gate/me/access", { cache: "no-store" }));
  } catch {
    return false;
  }
}

export async function recoverPayment(payload: Record<string, string>, previousUntil: string | null): Promise<boolean> {
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  for (const delay of [0, 1000, 3000]) {
    if (delay) await wait(delay);
    try {
      await fetchJson("/api/gate/checkout/verify", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      return true;
    } catch { /* The webhook may still grant access. */ }
  }
  for (const delay of [2000, 4000, 8000]) {
    await wait(delay);
    if (await accessArrived(previousUntil)) return true;
  }
  return false;
}
