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
       SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM APP_BASE_URL NEXT_PUBLIC_SITE_URL CRON_SECRET)

val() {  # value of $1 from .env.local (last occurrence, surrounding quotes removed)
  local v
  v=$(grep -E "^$1=" .env.local | tail -1 | cut -d= -f2- || true)
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  if [ -z "$v" ] && [ "$1" = NEXT_PUBLIC_RAZORPAY_KEY_ID ]; then v=$(val RAZORPAY_KEY_ID); fi
  printf '%s' "$v"
}

test_keys=0
[[ "$(val RAZORPAY_KEY_ID)" == rzp_test_* ]] && test_keys=1

for n in "${NAMES[@]}"; do
  v=$(val "$n")
  if [ -z "$v" ]; then
    echo "  skip $n (empty in .env.local)"
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
