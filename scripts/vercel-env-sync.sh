#!/usr/bin/env bash
# Push payment / email / site settings from .env.local to Vercel (production).
#   bash scripts/vercel-env-sync.sh            # push
#   bash scripts/vercel-env-sync.sh --check    # only report which values are set
# Values never leave this machine except to Vercel. NEXT_PUBLIC_* values are baked in at build time,
# so redeploy after syncing (push to main, or `vercel --prod`).
set -euo pipefail
cd "$(dirname "$0")/.."

NAMES=(RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET NEXT_PUBLIC_RAZORPAY_KEY_ID
       SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM APP_BASE_URL NEXT_PUBLIC_SITE_URL CRON_SECRET)

val() {  # value of $1 from .env.local (last occurrence, surrounding quotes removed)
  local v
  v=$(grep -E "^$1=" .env.local | tail -1 | cut -d= -f2- || true)
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  if [ -z "$v" ] && [ "$1" = NEXT_PUBLIC_RAZORPAY_KEY_ID ]; then v=$(val RAZORPAY_KEY_ID); fi
  printf '%s' "$v"
}

missing=()
for n in "${NAMES[@]}"; do [ -n "$(val "$n")" ] || missing+=("$n"); done
if [ "${1:-}" = "--check" ] || [ ${#missing[@]} -gt 0 ]; then
  for n in "${NAMES[@]}"; do
    v=$(val "$n"); printf '  %-28s %s\n' "$n" "$([ -n "$v" ] && echo set || echo EMPTY)"
  done
  [ ${#missing[@]} -gt 0 ] && { echo "Fill these in .env.local first: ${missing[*]}"; exit 1; }
  exit 0
fi

for n in "${NAMES[@]}"; do
  vercel env rm "$n" production -y >/dev/null 2>&1 || true
  printf '%s' "$(val "$n")" | vercel env add "$n" production >/dev/null
  echo "  set $n"
done
echo "Done. Redeploy production so the new values take effect."
