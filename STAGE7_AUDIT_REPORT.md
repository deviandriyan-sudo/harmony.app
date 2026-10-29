# HARMONY V3.8.5 — Source-driven Stage 7 audit

Baseline: `harmony.app(20261029-025411).zip` (429 original ZIP entries, including directory markers); Next 16.4.3, React 19.2.4, TypeScript, Supabase, Vercel, SheetJS 0.20.3. 64 pages, 48 API handlers. Source/DB migrations existing in ZIP are not proof of current Supabase production configuration.

| Priority | Issue and code evidence | Root cause | Change made | Validation |
|---|---|---|---|---|
| P0 | `lib/server/hr-api-auth.ts`, `lib/server/user-api-auth.ts`, `lib/server/remed-api-auth.ts`, `app/api/auth/access/route.ts` | Email-only fallback could bind a different Auth UUID to privileged records; Re-Med attempted an UPDATE automatically | Enforce verified JWT UUID to match app_users.id/remed_user_access.auth_user_id; remove unreviewed account relinking | Stage7 source guards + code inspection; live user mapping untested |
| P0 | `lib/leave-balance-canonical.ts` and postpone API | Fallback selected expired past cycles and recomputed a display balance different from DB summary | Reject cycles whose end is past; summary remains authoritative; mismatches reported rather than silently overridden | Stage7 boundary test; DB crediting unverified |
| P0 | `lib/server/system-control.ts` | On missing/error control table, email delivery was enabled by fallback | Keep legacy application accessible but block sending and queue drain until system control is readable; missing row now unconfigured | Stage7 guards, no live provider test |
| P1 | `app/api/employee/phl-claims/route.ts` | Duplicate-date preflight used only latest 500 employee/machine records | Paginated historical scan with upper safety cap; fail-closed when verification incomplete | Source guards; DB atomic RPC not tested |
| P1 | `vercel.json` | Only email cron configured; no annual leave maturity schedule in this ZIP | No speculative crediting scheduler added; full production SQL/scheduler diagnosis supplied | Static inventory; production scheduler unverified |
| P1 | SQL/RPC for postpone and expiry | Production definitions and authoritative policy constraints not bundled | Deferred changes requiring schema/business-rule verification; no writes | Not verified |
| P2 | `app/api/hr/users/route.ts` | Master employee email update error was ignored after account creation | Return explicit partial-success error instead of falsely claiming successful synchronization | Code inspection; integrated Auth test unavailable |
| P3 | `app/theme-normalization.css` | Theme variables existed but no shared full semantic vocabulary | Added semantic variable aliases for background/surface/elevated/border/text/muted/primary/secondary/status/focus; retain glass styles and modal styling | Theme source tests; visual viewport screenshots unavailable |
| P4 | Root documentation and `tsconfig.tsbuildinfo` | Old Stage5/6 reports and hashes clutter runtime root; generated TS cache stored in ZIP | Move historical docs to `docs/archive` (no loss), exclude cache, keep all SQL/history | Source inventory and ZIP verification |

## Automation inventory (source, not production evidence)

| Automation | Trigger/handler | DB dependency | Schedule in ZIP | Failure/retry | Verification |
|---|---|---|---|---|---|
| General notification queue | Request `after()` drain, `/api/notifications/queue`, `/api/cron/attendance-emails` | `harmony_job_queue`, `harmony_claim_jobs_v1` | Cron daily at `0 0 * * *` UTC; after() opportunistic | 6 attempts, exponential delay, claim lease requires DB semantics | Code present; production scheduling unverified |
| Attendance upload emails | Attendance upload enqueue, email cron | `harmony_claim_attendance_emails_v1`, outbox | Same cron daily, background send paths | Provider idempotency key and DB claim; details require DB definitions | Code present; production sending unverified |
| Leave maturity/annual expiry | Database-driven cycle/view paths, no server cron in ZIP | Installed lifecycle functions/views unknown | No configured Vercel maturity cron; Supabase cron unknown | Cannot certify idempotency without DB functions | **Not verified — P1 open** |
| Postpone activation/expiry | Employee/HR RPC calls and summary lifecycle view | `employee_submit_leave_postpone_atomic`, HR approval RPCs | No explicit Vercel job | DB behavior unknown | Not verified |
| PHL approval/expiry | Employee/supervisor/HR RPCs and attendance links | `harmony_employee_submit_phl_claim_v1`, HR atomic/exception RPCs | No explicit Vercel job | DB behavior unknown; preflight now scans full history | Not verified |
| Maintenance mode | `harmony_system_controls`, email guards | System controls table | Read per relevant request | Email fail closed if status unknown | Static guard test |

## Business-rule decisions blocked by production evidence

Do not invent service tenure for annual leave, maturity date formula, entitlement, postpone minimum/maximum, postponed carry-forward expiry, PHL expiry, or order of consumption. Rules must be extracted from installed RPCs/DB objects and confirmed HR documentation. A fully automated backfill cannot be safely implemented with the ZIP alone.

## Security caveats

The stricter UUID identity rule may expose pre-existing mismatches: employees who previously logged in by matching email with the wrong Auth UUID will now receive an access error until HR reconciles IDs. This is intentional fail-closed behavior; do **not** recreate employees or silently overwrite role mappings.

`SUPABASE_SERVICE_ROLE_KEY` is used only by server helpers; never expose it in client code, Git, logs or ZIP. Database RLS and SECURITY DEFINER protections still require live policy/function verification. PHL preflight is advisory: only an atomic DB uniqueness/transaction rule can eliminate concurrent double-claim races.

## Validation distinction

Stage 7 source checks and lifecycle boundary behavior are run separately. Legacy script `test:smoke`, `test:ui`, `test:balance` and theme tests are source-level/static checks, not browser or production regression tests. Local Next.js dependency installation, full TypeScript/lint/build and Supabase integration are not represented as PASS unless run. The customer must validate all roles in staging before publishing.
