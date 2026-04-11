#!/usr/bin/env bash
# ============================================================
# verify-security-fixes.sh
# Re-runs every original reproduction curl from the security
# audit and prints PASS or FAIL for each finding.
#
# Usage:
#   export SUPABASE_ANON_KEY="eyJ..."
#   export APP_URL="https://kanban-production-523d.up.railway.app"
#   bash scripts/verify-security-fixes.sh
# ============================================================
set -euo pipefail

ANON="${SUPABASE_ANON_KEY:-}"
SUPA_URL="https://imsqnoxztoxlmiumdalu.supabase.co"
APP_URL="${APP_URL:-https://kanban-production-523d.up.railway.app}"

if [[ -z "$ANON" ]]; then
  echo "ERROR: set SUPABASE_ANON_KEY before running this script."
  exit 1
fi

PASS=0
FAIL=0

check() {
  local id="$1" desc="$2" expected="$3" actual="$4"
  if echo "$actual" | grep -qE "$expected"; then
    echo "✅ PASS  [$id] $desc"
    ((PASS++)) || true
  else
    echo "❌ FAIL  [$id] $desc"
    echo "         Expected pattern: $expected"
    echo "         Got: $(echo "$actual" | head -c 200)"
    ((FAIL++)) || true
  fi
}

echo ""
echo "=================================================="
echo " Kanban Pro — Security Fix Verification"
echo " App:      $APP_URL"
echo " Supabase: $SUPA_URL"
echo "=================================================="
echo ""

# ── KB-01 through KB-07: RLS must block anon reads ────────────────

TABLES=(profiles kanban_projects kanban_tasks kanban_messages kanban_resources kanban_cost_centers kanban_templates)
FINDINGS=(KB-01 KB-02 KB-03 KB-04 KB-05 KB-06 KB-07)

for i in "${!TABLES[@]}"; do
  TABLE="${TABLES[$i]}"
  FID="${FINDINGS[$i]}"
  RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
    "${SUPA_URL}/rest/v1/${TABLE}?select=*&limit=1" \
    -H "apikey: ${ANON}" \
    -H "Authorization: Bearer ${ANON}")
  # 200 with data = FAIL; 200 with [] = borderline (RLS enabled but anon got through);
  # We want 0 rows returned. Check body too.
  BODY=$(curl -s \
    "${SUPA_URL}/rest/v1/${TABLE}?select=*&limit=1" \
    -H "apikey: ${ANON}" \
    -H "Authorization: Bearer ${ANON}")
  # Expected: empty array []
  check "$FID" "anon cannot read $TABLE" "^\[\]$" "$BODY"
done

# ── KB-08: /api/db/migrate must not return {"ok":true} unauthenticated ─────

MIGRATE_BODY=$(curl -s -X POST "${APP_URL}/api/db/migrate" \
  -H "Content-Type: application/json")
# Expected: 404 (no body) or 401, NOT {"ok":true}
check "KB-08" "POST /api/db/migrate is gated (no ok:true without secret+JWT)" \
  "Not Found|Unauthorized|^$" "$MIGRATE_BODY"

# ── KB-09: /api/push/notify must reject unauthenticated requests ────────────

NOTIFY_BODY=$(curl -s -X POST "${APP_URL}/api/push/notify" \
  -H "Content-Type: application/json" \
  -d '{"mentions":[{"type":"user","id":"00000000-0000-0000-0000-000000000001"}]}')
check "KB-09" "POST /api/push/notify rejects unauthenticated callers" \
  "Token inválido|Unauthorized|401" "$NOTIFY_BODY"

# ── KB-11: Security headers must be present ─────────────────────────────────

HEADERS=$(curl -sI "${APP_URL}/")
check "KB-11a" "Strict-Transport-Security header present" \
  "strict-transport-security" "$(echo "$HEADERS" | tr '[:upper:]' '[:lower:]')"
check "KB-11b" "X-Frame-Options or frame-ancestors CSP present" \
  "x-frame-options|frame-ancestors" "$(echo "$HEADERS" | tr '[:upper:]' '[:lower:]')"
check "KB-11c" "X-Content-Type-Options: nosniff present" \
  "x-content-type-options.*nosniff" "$(echo "$HEADERS" | tr '[:upper:]' '[:lower:]')"
check "KB-11d" "X-Powered-By header absent" \
  "^$" "$(echo "$HEADERS" | grep -i 'x-powered-by' || true)"
check "KB-11e" "X-Protected-By: Ximinoze present" \
  "x-protected-by.*ximinoze" "$(echo "$HEADERS" | tr '[:upper:]' '[:lower:]')"

# ── KB-13: /api/chat/upload must return 401 before revealing bucket info ─────

UPLOAD_BODY=$(curl -s -X POST "${APP_URL}/api/chat/upload" \
  -H "Content-Type: text/plain" \
  -H "x-filename: test.txt" \
  --data "probe")
check "KB-13" "POST /api/chat/upload returns 401 without auth (not bucket error)" \
  "Autenticação necessária|401|Token" "$UPLOAD_BODY"

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "=================================================="
echo " Results: $PASS passed, $FAIL failed"
echo "=================================================="
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
