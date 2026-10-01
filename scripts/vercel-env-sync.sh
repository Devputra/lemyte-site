#!/usr/bin/env bash
# Push payment / email / site settings from .env.local to a Vercel environment.
#   bash scripts/vercel-env-sync.sh production [--check]
#   bash scripts/vercel-env-sync.sh preview    [--check]
# Empty values are skipped (reported). Safety: Razorpay TEST keys (rzp_test_) are never pushed to
# production — with test keys on the live site anyone could buy a plan with a test card.
# NEXT_PUBLIC_* values are baked in at build time, so redeploy after syncing.
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET="${1:?usage: vercel-env-sync.sh production|preview [--check]}"
[[ "$TARGET" == production || "$TARGET" == preview ]] || { echo "target must be production or preview"; exit 1; }

NAMES=(RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET NEXT_PUBLIC_RAZORPAY_KEY_ID
       SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM)
# Not synced on purpose: NEXT_PUBLIC_BASE_URL differs per environment (localhost locally, https://lemyte.com in production).

raw() {  # value of $1 from .env.local (last occurrence)
  grep -E "^$1=" .env.local | tail -1 | cut -d= -f2- || true
}

val() {  # value to push for $1 (surrounding quotes removed)
  local v
  # Preview always gets the TEST keys (kept as RAZORPAY_KEY_TEST_*), so live keys never reach preview deploys.
  case "$TARGET:$1" in
    preview:RAZORPAY_KEY_ID|preview:NEXT_PUBLIC_RAZORPAY_KEY_ID) v=$(raw RAZORPAY_KEY_TEST_API_KEY) ;;
    preview:RAZORPAY_KEY_SECRET) v=$(raw RAZORPAY_KEY_TEST_SECRET) ;;
    *) v=$(raw "$1") ;;
  esac
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  if [ -z "$v" ] && [ "$1" = NEXT_PUBLIC_RAZORPAY_KEY_ID ]; then v=$(val RAZORPAY_KEY_ID); fi
  printf '%s' "$v"
}

test_keys=0
[[ "$(val RAZORPAY_KEY_ID)" == rzp_test_* ]] && test_keys=1

# Live keys must match each other and actually work (read-only API call; nothing is charged).
if [ "$TARGET" = production ] && [ $test_keys = 0 ] && [ -n "$(val RAZORPAY_KEY_ID)" ]; then
  [[ "$(val RAZORPAY_KEY_ID)" == rzp_live_* ]] || { echo "RAZORPAY_KEY_ID is neither rzp_test_ nor rzp_live_"; exit 1; }
  code=$(curl -s -o /dev/null -w "%{http_code}" -u "$(val RAZORPAY_KEY_ID):$(val RAZORPAY_KEY_SECRET)" "https://api.razorpay.com/v1/orders?count=1")
  [ "$code" = 200 ] || { echo "Live Razorpay keys rejected by the API (HTTP $code) — check key id/secret"; exit 1; }
  echo "  live Razorpay keys verified with the API"
fi

for n in "${NAMES[@]}"; do
  v=$(val "$n")
  if [ -z "$v" ]; then
    echo "  skip $n (empty in .env.local)"
  elif [ "$TARGET" = production ] && [[ "$v" == *localhost* || "$v" == *127.0.0.1* ]]; then
    echo "  skip $n (points at localhost — never pushed to production)"
  elif [ "$TARGET" = production ] && [ $test_keys = 1 ] && [[ "$n" == *RAZORPAY_KEY* ]]; then
    echo "  skip $n (test key — put rzp_live_ keys in .env.local for production)"
  elif [ "${2:-}" = "--check" ]; then
    echo "  ready $n"
  else
    printf '%s' "$v" | vercel env add "$n" "$TARGET" --force >/dev/null 2>&1 \
      || { vercel env rm "$n" "$TARGET" -y >/dev/null 2>&1 || true; printf '%s' "$v" | vercel env add "$n" "$TARGET" >/dev/null; }
    echo "  set $n -> $TARGET"
  fi
done
[ "${2:-}" = "--check" ] || echo "Done. Redeploy $TARGET so the new values take effect."
