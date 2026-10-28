-- HARMONY Stage 5: READ-ONLY (no employee emails or names returned).
-- HR master table and app_users are distinct from Supabase Auth identities.
-- Execute from Supabase SQL Editor with permission to read auth.users.

SELECT
  COUNT(*) FILTER (WHERE e.is_active IS DISTINCT FROM FALSE) AS active_employees,
  COUNT(*) FILTER (WHERE e.is_active IS DISTINCT FROM FALSE
      AND NULLIF(btrim(e.email),'') IS NOT NULL AND app.id IS NULL)
      AS active_employees_with_email_but_no_app_user,
  COUNT(*) FILTER (WHERE app.id IS NOT NULL AND au.id IS NULL)
      AS linked_employee_app_users_missing_auth_identity,
  COUNT(*) FILTER (WHERE app.id IS NOT NULL AND app.is_active IS FALSE)
      AS linked_employee_app_users_inactive,
  COUNT(*) FILTER (WHERE app.id IS NOT NULL AND au.id IS NOT NULL
      AND LOWER(COALESCE(au.email,'')) <> LOWER(COALESCE(app.email,'')))
      AS auth_and_app_user_email_mismatches
FROM public.employees e
LEFT JOIN public.app_users app ON app.employee_id = e.id
LEFT JOIN auth.users au ON au.id = app.id;

-- Distinct auth identities that have no HARMONY app_users mapping.
SELECT COUNT(*) AS auth_identities_without_harmony_app_user
FROM auth.users au
LEFT JOIN public.app_users app ON app.id = au.id
WHERE app.id IS NULL;

-- This intentionally does not create or update accounts, passwords, or data.
