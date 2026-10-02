HARMONY DATABASE COMPACT V2
===========================

BASELINE
HARMONY + RE-MED V1.2 single-login.

PURPOSE
Reduce technical table clutter in Supabase schema `public` without deleting PHL/Re-Med history.

TARGET PUBLIC TABLES
PHL:
- phl_records
- phl_hr_adjustments

RE-MED:
- remed_user_access
- remed_entitlements
- remed_claim_types
- remed_claims
- remed_claim_attachments

TECHNICAL SCHEMAS
- harmony_internal = allocations, usage, counters, internal balance support
- harmony_audit    = audit/status/payment history
- harmony_archive  = legacy/obsolete retained data

DATABASE ORDER
1. _setup/HARMONY_DATABASE_COMPACT_V2_PRECHECK.sql (already validated for this release)
2. _setup/HARMONY_DATABASE_COMPACT_V2_MIGRATION.sql
3. _setup/HARMONY_DATABASE_COMPACT_V2_POSTCHECK.sql
4. Export POSTCHECK CSV and verify before production acceptance.

ROLLBACK
- _setup/HARMONY_DATABASE_COMPACT_V2_ROLLBACK.sql

SOURCE INSTALL
Copy all contents of this folder to:
D:\WEBSITE\harmony.app
and Replace/Overwrite.
Do not replace/delete .env.local, .git, or node_modules.

BUILD GATE
cd D:\WEBSITE\harmony.app
npm run build

If build fails: STOP. Do not git push/deploy.

If build passes:
git status
git add .
git commit -m "refactor: compact Harmony PHL and Re-Med database schemas"
git push origin HEAD:main

IMPORTANT
- Do NOT rerun the legacy HARMONY_REMED_V1_MIGRATION.sql.
- The active legacy migration file is intentionally disabled after Compact V2.
- Existing original legacy SQL is retained in _setup/_legacy_reference only for audit/reference.
