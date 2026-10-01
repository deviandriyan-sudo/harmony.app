HARMONY + RE-MED V1.1.2.2 — SUPABASE MIGRATION HOTFIX

HARMONY + RE-MED V1.1.2 FULL REPLACEMENT

COPY TARGET
D:\WEBSITE\harmony.app

IMPORTANT
- Do not replace .env.local.
- Do not migrate legacy plaintext passwords.
- Do not run MIGRATION before PRECHECK is reviewed.

DATABASE ORDER
1. Run _setup/HARMONY_REMED_V1_PRECHECK.sql in Supabase SQL Editor.
2. Export the result grid to CSV.
3. Confirm all 37 employee rows show MATCHED_EXACTLY_ONCE.
4. Then run _setup/HARMONY_REMED_V1_MIGRATION.sql.
5. Then run _setup/HARMONY_REMED_V1_POSTCHECK.sql.

EXPECTED LEGACY TOTALS AFTER SUCCESSFUL MIGRATION
- 37 legacy 2026 entitlements if all 37 employees exist in HARMONY.
- Total plafond: 129000000.
- Historical legacy_used: 25388104.
- Sanitized legacy snapshots: 77 rows = 39 users + 37 employees + 1 reimbursement.
- Legacy passwords: 0 rows / never migrated.

BUILD
cd D:\WEBSITE\harmony.app
npm run build

ONLY IF BUILD PASSES
git status
git add .
git commit -m "feat: consolidate Re-Med legacy data into Harmony"
git push origin HEAD:main


V1.1.2.2 HOTFIX:
- Replaced TEMP TABLE legacy staging with short-lived public staging tables.
- Staging tables are revoked from anon/authenticated and dropped in the same migration.
- Fixes ERROR 42P01 relation tmp_remed_legacy_users does not exist.
- Migration remains idempotent for rerun after failed V1.1.2 attempt.


V1.1.2 SQL HOTFIX:
- Explicit $remed_fn$ PL/pgSQL delimiters.
- Run the FULL migration file in Supabase SQL Editor (Ctrl+A -> Run).
- Do not execute a selected fragment that starts with IF/ELSIF/END IF.
