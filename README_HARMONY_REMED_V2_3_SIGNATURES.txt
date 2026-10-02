HARMONY + RE-MED V2.3 — SIGNATURE MANAGEMENT

Scope:
- Payment form renders employee/HR/Finance signatures.
- Default HR signatory: Devi Andriyan Subakti (employee_number 1010793).
- Default Finance signatory: Nova Tri Anggraini (employee_number 1010801).
- HR can change the HR/Finance function holder from Re-Med > Manajemen Tanda Tangan.
- Employee can upload/replace/delete their own signature from Re-Med > Akun & Tanda Tangan.
- HR can upload/replace signatures on behalf of employees.
- Signature storage uses PRIVATE Supabase Storage bucket: remed-signatures.
- Signature binaries are never served from /public and are ignored by Git.
- 34 matched signatures from the uploaded employee-signature ZIP are included only under _setup/_private_signature_seed for local one-time import.
- The supplied files did not contain an identifiable Nova Tri Anggraini signature. Nova is assigned as Finance signatory, but her signature image must be uploaded through Manajemen Tanda Tangan.
- Existing approved claims are backfilled with current role-holder snapshots; future approvals snapshot the role holder at approval time.

Order:
1. _setup/HARMONY_REMED_V2_3_SIGNATURES_PRECHECK.sql
2. _setup/HARMONY_REMED_V2_3_SIGNATURES_MIGRATION.sql
3. PowerShell: .\_setup\SEED_REMED_SIGNATURES.ps1
4. _setup/HARMONY_REMED_V2_3_SIGNATURES_POSTCHECK.sql
5. npm run build

IMPORTANT:
- _setup/_private_signature_seed/ is listed in .gitignore. Do not remove that ignore rule.
- The seed script reads Supabase values from the existing .env.local. It does not print secret keys.
