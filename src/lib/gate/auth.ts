// src/lib/gate/auth.ts
// Shared authorization check for GATE attempt routes.

export function isAuthorizedActor(params: {
  ownerUserId: string | null;
  ownerGuestToken: string | null;
  authUserId: string | null;
  demoCookie: string | null;
}): boolean {
  const { ownerUserId, ownerGuestToken, authUserId, demoCookie } = params;

  if (ownerUserId) {
    return authUserId === ownerUserId;
  }

  if (ownerGuestToken) {
    return demoCookie === ownerGuestToken;
  }

  return false;
}
