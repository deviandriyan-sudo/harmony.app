HARMONY V8.2 — PHASE 3 OUTSOURCE PORTAL & AUTHORIZATION

PACKAGE TYPE
- Full source replacement based on latest harmony.app(4).zip.
- Copy contents of COPY_TO_HARMONY_APP into D:\WEBSITE\harmony.app and overwrite.
- .env.local, .git, node_modules, .next and build cache are NOT included.

WHAT PHASE 3 DOES
- Organic portal remains full HARMONY.
- Outsource portal only exposes Beranda, Absensi, Pengaturan.
- Direct Employee Leave/PHL/Approval Team routes are blocked for outsource.
- Outsource dashboard only reads attendance + workforce context.
- Outsource attendance excludes Leave/PHL types and never creates PHL candidates.
- Security employee can verify detected shift or request HR review.
- employee_workforce_history stores effective-dated Organic/Outsource classification.
- HR workforce changes use one atomic RPC for employee master + history.
- DB guard prevents new Outsource Leave/PHL/Postpone records.
- DB PHL eligibility prevents auto-PHL for outsource attendance on the effective date.
- PHL reconcile uses an outsource no-op so later reclassification does not silently reverse old PHL credit.
- DB annual-leave sync skips outsource entitlement by effective date.
- Historical Leave/PHL/balance data is preserved.

SAFE INSTALL ORDER
1. Make sure current source is already committed/backed up.
2. Extract this ZIP.
3. Copy ALL contents of COPY_TO_HARMONY_APP to:
   D:\WEBSITE\harmony.app
4. Choose Replace/Overwrite.
5. Do NOT change .env.local.
6. Supabase SQL Editor: run _setup\HARMONY_V8_2_PHASE3_PRECHECK.sql (READ ONLY).
7. Build locally BEFORE changing production DB:
   cd D:\WEBSITE\harmony.app
   npm run build
8. If build FAILS: STOP. Do not run migration, do not push, do not deploy.
9. If build PASSES, use a short maintenance window where HR does not edit workforce classification.
10. Run _setup\HARMONY_V8_2_PHASE3_MIGRATION.sql in Supabase.
11. Run _setup\HARMONY_V8_2_PHASE3_POSTCHECK.sql.
12. If postcheck is correct, push:
   git status
   git add .
   git commit -m "feat: add outsource attendance portal and authorization guards"
   git push origin HEAD:main
13. Vercel -> Deployments -> confirm the commit -> wait until Ready.
14. Run _audit\ACCEPTANCE_TEST_V8_2_PHASE3.txt.

ROLLBACK
- Source rollback: use Git revert / previous stable commit.
- DB behavior rollback (only if needed):
  _setup\HARMONY_V8_2_PHASE3_ROLLBACK_BEHAVIOR.sql
- Rollback intentionally keeps employee_workforce_history so audit data is not destroyed.

BUILD STATUS OF THIS DELIVERABLE
- Route audit: PASS (59 route entries; 0 exact/normalized conflicts).
- Local @/ import resolution: PASS (0 missing).
- TS/TSX syntax transpile: PASS (96 files; 0 syntax diagnostics).
- Workforce route/filter unit checks: PASS.
- Phase 2 Security detector regression checks: PASS for S1/S2/S3 and all three long-shift combinations.
- Full Next.js production build could NOT be completed in the isolated audit container because project dependencies are not installed and npm registry access timed out. Therefore your local `npm run build` is the mandatory deployment gate; this package is NOT labeled build-passed until that succeeds.
