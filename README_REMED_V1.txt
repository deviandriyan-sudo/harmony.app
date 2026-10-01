HARMONY + RE-MED V1
Baseline: HARMONY V8.1.2 Stable Pre-Outsource

SHORT INSTALL
1. Backup D:\WEBSITE\harmony.app.
2. Run _setup\HARMONY_REMED_V1_PRECHECK.sql in Supabase SQL Editor.
3. Extract package and run APPLY_HARMONY_REMED_V1.ps1. Type APPLY.
4. cd D:\WEBSITE\harmony.app
5. npm run build
6. If build SUCCESS: run _setup\HARMONY_REMED_V1_MIGRATION.sql, then _setup\HARMONY_REMED_V1_POSTCHECK.sql.
7. git status
   git add .
   git commit -m "feat: integrate Re-Med medical reimbursement into Harmony"
   git push origin HEAD:main
8. Vercel -> HARMONY -> Deployments -> wait until Ready.

FINANCE
After deploy, login Re-Med as HR -> Akses Re-Med.
If Finance Auth does not exist, create finance@polteksimasberau.ac.id with a NEW password there.

DO NOT
- Do not restore outsource attendance files.
- Do not copy legacy plaintext passwords.
- Do not run migration if npm run build fails.
