# Security Fixes — 2026-04-11

## Summary

Nine findings were identified and fixed. The root cause of KB-01 through KB-07 was a single
class of Supabase RLS misconfiguration: the "Enable read access for all users" Studio template,
which silently grants the anonymous (unauthenticated) role SELECT access to every row.

---

## Findings and Fixes

### [CRITICAL] KB-01 — KB-07: RLS SELECT policies allowed anon to read all tables

**Tables affected:** `profiles`, `kanban_projects`, `kanban_tasks`, `kanban_messages`,
`kanban_resources`, `kanban_cost_centers`, `kanban_templates`

**Root cause:** Supabase Studio's "Enable read access for all users" template creates:
```sql
CREATE POLICY "Enable read access for all users" ON public.X FOR SELECT USING (true);
```
The label "all users" means **all roles including anonymous**, not "all authenticated users".
Any HTTP client with just the public anon key could `curl` the REST endpoint and read every row.

**Also contributing:** `server.js` migration SQL had two explicit `DISABLE ROW LEVEL SECURITY`
statements (`kanban_messages`, `kanban_push_subscriptions`) that ran on every app startup,
overriding any manual fixes applied in Supabase Studio.

**Fix applied:**
1. `supabase/migrations/20260411000000_fix_rls.sql` — drops all existing policies on the 9
   affected tables and recreates them scoped to `TO authenticated` only.
2. `server.js` MIGRATION_SQL — removed both `DISABLE ROW LEVEL SECURITY` lines; replaced
   `FOR ALL ... WITH CHECK (true)` with explicit per-operation policies:
   - SELECT: `USING (true)` scoped to `authenticated`
   - INSERT: `WITH CHECK (auth.uid() IS NOT NULL)`
   - UPDATE/DELETE: `USING (true)` scoped to `authenticated`
3. Special handling for `kanban_cost_centers`: `is_private = true` rows are visible only to
   `created_by`; non-private rows visible to all authenticated users.
4. `profiles` and `kanban_push_subscriptions` retain strict per-user write isolation.

**Verification:**
```bash
# After applying the migration, anon reads must return []:
curl "https://imsqnoxztoxlmiumdalu.supabase.co/rest/v1/profiles?select=*" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# Expected: []
```

**Important manual step:** The `kanban_resources` table contains a row with a Google Drive URL
("Drive de Clientes"). Even after this RLS fix, the Drive folder itself may still be accessible
to anyone with the URL. Go to Google Drive → open the folder → Share → change from
"Anyone with the link" to "Restricted".

---

### [CRITICAL] KB-08: POST /api/db/migrate was unauthenticated

**Reproduction:** `curl -X POST https://kanban-production-523d.up.railway.app/api/db/migrate`
returned `{"ok":true}`.

**Fix applied:** Double gate added to the route:
1. `x-migrate-secret` header must match the `MIGRATE_SECRET` environment variable (Railway).
   Returns HTTP 404 (not 401) to hide route existence from scanners.
2. Caller JWT must pass `verifyAdmin()` check (existing fix from previous commit).

**Action required:** Generate a 32+ character random secret and add it to Railway:
```bash
openssl rand -hex 32
# Add output as MIGRATE_SECRET in Railway env vars
```

---

### [CRITICAL] KB-09: POST /api/push/notify was unauthenticated

**Reproduction:** `curl -X POST .../api/push/notify -d '{}'` returned `{"ok":true}`.

**Impact:** Phishing — attacker could trigger push notifications through the legitimate PWA
channel (real app icon, real domain) to any user who had the push subscription active.

**Fix applied:** Route now calls `verifyJWT(req)` before processing. Any request without a
valid Supabase JWT receives HTTP 401. Rate limiting (`limiterAdmin`) also applied.

---

### [HIGH] KB-10: POST /api/auth/signup accepted any email including disposable domains

**Fix applied (partial):**
- Minimum password length increased from 6 to 8 characters.
- Email format validated with regex before reaching Supabase.
- Error messages are generic (no internal Supabase messages leaked).

**Recommended additional steps (manual):**
- Supabase Dashboard → Authentication → Rate Limits → set Sign-ups to ~5/hour per IP.
- Consider enabling email confirmation: Dashboard → Auth → Email → "Confirm email" = ON.
- For invite-only mode: modify `/api/auth/signup` to require a valid invite token from
  `/api/admin/invite`.

**Cleanup:** Delete test accounts created during the audit:
```sql
DELETE FROM auth.users WHERE email LIKE '%@example.invalid';
```

---

### [HIGH] KB-11: Express server had no security headers

**Fix applied:** `helmet` npm package added. Configured with:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Custom `X-Protected-By: Ximinoze` header on all responses

**Verification:**
```bash
curl -I https://kanban-production-523d.up.railway.app/ | grep -iE "strict-transport|x-frame|x-content-type"
```

---

### [INFO] KB-13: /api/chat/upload revealed "Bucket not found" before auth check

**Fix applied:** Auth check (`verifyJWT`) now runs before any Supabase storage calls.
Unauthenticated requests receive HTTP 401 "Autenticação necessária para upload." before
the server queries whether the bucket exists.

---

## Files Changed

| File | Change |
|------|--------|
| `server.js` | Remove DISABLE RLS lines; fix MIGRATION_SQL policies; add MIGRATE_SECRET gate to KB-08; add JWT auth to KB-09 |
| `supabase/migrations/20260411000000_fix_rls.sql` | New file — canonical RLS migration to run in Supabase SQL Editor |
| `scripts/verify-security-fixes.sh` | New file — automated reproduction + verification for all findings |
| `SECURITY_FIXES_2026-04-11.md` | This file |

---

## How to Verify (automated)

```bash
export SUPABASE_ANON_KEY="$(grep VITE_SUPABASE_ANON_KEY client/.env | cut -d= -f2)"
export APP_URL="https://kanban-production-523d.up.railway.app"
bash scripts/verify-security-fixes.sh
# All checks should print ✅ PASS
```

---

## Prevention: Never use the Supabase Studio RLS Template

> ⚠️ **Internal guideline — share with all developers and admins with Supabase access.**

When creating a new table in Supabase Studio, the RLS tab offers a quick template:
**"Enable read access for all users"**

**Do not click this template.** Despite its name, it creates:
```sql
CREATE POLICY "Enable read access for all users" ON public.your_table
  FOR SELECT USING (true);
```
"All users" includes the anonymous role. Anyone on the internet with the project's anon key
(which is embedded in every browser bundle) can then read every row in that table.

**Correct approach for any new table:**

1. Enable RLS (the toggle) — good.
2. Click "New policy" → start with a **blank** policy, not a template.
3. For shared workspace tables (all authenticated users see all rows):
   ```sql
   CREATE POLICY "select_authenticated" ON public.new_table
     FOR SELECT TO authenticated USING (true);
   ```
4. For user-owned tables:
   ```sql
   CREATE POLICY "select_own" ON public.new_table
     FOR SELECT TO authenticated USING (created_by = auth.uid()::text);
   ```
5. Never grant SELECT, INSERT, UPDATE, or DELETE to the `anon` role unless the table
   is intentionally public (e.g., a public blog posts table).

---

*Applied by: Claude Code / Kanban Pro security review — 2026-04-11*
