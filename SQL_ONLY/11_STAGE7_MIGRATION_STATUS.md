# Stage 7 database migration status

**No Stage 7 production-writing SQL is supplied.** The supplied ZIP does not contain a confirmed production definition of the annual-leave maturity/expiry RPCs, actual configured pg_cron schedules, or approved HR rules for initial eligibility/expiry. A speculative crediting function could double-credit employees or alter historical balances. Run `09_STAGE7_LIFECYCLE_AUTOMATION_DIAGNOSTIC_READ_ONLY.sql` query-by-query, share redacted results and relevant installed function definitions for the next migration. Do not recreate any Stage 6 correction function: installation was already reported successful with 48 adjustment rows, but transaction behavior still needs an HR test.

Rollback for Stage 7 **source**: restore the backup of the application files and redeploy the prior Git commit. Rollback of actual leave/PHL data is not appropriate or needed because Stage 7 contains no SQL writes.
