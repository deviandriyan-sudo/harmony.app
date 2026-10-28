# CHANGED_FILES — HARMONY V3.8.5

Baseline ZIP: V3.8.4. All updates are presentation/theme, version manifest, tests and documentation.

Existing files modified: 63. Added source files: 9. Deleted files: 0.

| File | Change | Reason / regression consideration |
|---|---|---|
| `CHANGED_FILES.md` | Added | Semantic presentation color replacement only; functional handlers unchanged. |
| `DESIGN_SYSTEM.md` | Added | Semantic presentation color replacement only; functional handlers unchanged. |
| `INSTALL.md` | Added | Semantic presentation color replacement only; functional handlers unchanged. |
| `README.md` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `ROUTE_INVENTORY_V385.csv` | Added | Semantic presentation color replacement only; functional handlers unchanged. |
| `THEME_AUDIT_REPORT.md` | Added | Semantic presentation color replacement only; functional handlers unchanged. |
| `VALIDATION_REPORT.md` | Added | Semantic presentation color replacement only; functional handlers unchanged. |
| `app/auth/callback/page.tsx` | Modified | Dark/light public auth surfaces, preserved auth handlers. |
| `app/employee/approvals/[employeeId]/[period]/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/approvals/attendance/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/approvals/leave/postpone/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/approvals/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/approvals/phl/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/attendance/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/dashboard/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/layout.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/leave/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/leave/postpone/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/phl/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/employee/settings/page.tsx` | Modified | Semantic typography to match light/dark surfaces; Employee workflows unchanged. |
| `app/globals.css` | Modified | Design system architecture and import order; preserve existing theme provider and CSS compatibility. |
| `app/hr/attendance/approvals/[employeeId]/[period]/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/approvals/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/audit/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/data/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/export/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/final-report/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/sync/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/attendance/upload/page.tsx` | Modified | Theme-aware attendance surfaces, foregrounds, tables/statuses; approval/upload logic unmodified. |
| `app/hr/employees/page.tsx` | Modified | Directory balance/actions contrast and accessible controls; employee CRUD handlers unchanged. |
| `app/hr/holidays/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/layout.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/leave/administration/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/leave/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/leave/postpone/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/phl/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/settings/notifications/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/settings/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/settings/system-health/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/hr/users/page.tsx` | Modified | Replace fixed light-theme text with semantic foreground roles; HR workflows unchanged. |
| `app/layout.tsx` | Modified | Design system architecture and import order; preserve existing theme provider and CSS compatibility. |
| `app/remed/employee/account/page.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/remed/employee/claims/new/page.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/remed/finance/access/page.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/remed/hr/access/page.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/remed/hr/employees/page.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/remed/hr/signatures/page.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/remed/layout.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/remed/page.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `app/reset-password/page.tsx` | Modified | Dark/light public auth surfaces, preserved auth handlers. |
| `app/theme-normalization.css` | Added | Design system architecture and import order; preserve existing theme provider and CSS compatibility. |
| `components/attachments/HarmonyAttachments.tsx` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `components/cards/StatCard.tsx` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `components/employee/TodayTeamAvailability.tsx` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `components/layout/Topbar.tsx` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `components/organization/GeneralOrganizationChart.tsx` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `components/remed/ClaimStatusBadge.tsx` | Modified | Re-Med semantic status badge component; status values and labels unchanged. |
| `components/remed/PaymentRequestPrint.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `components/remed/RemedClaimList.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `components/remed/RemedPageHeader.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `components/remed/RemedProcessHistory.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `components/remed/RemedStatCard.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `components/remed/ReviewControls.tsx` | Modified | Role-specific Re-Med / Finance typography and printing context; payments and claims logic unchanged. |
| `components/system/SystemMaintenanceGate.tsx` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `components/ui/button.tsx` | Modified | Semantic presentation color replacement only; functional handlers unchanged. |
| `lib/version.ts` | Modified | Version metadata 3.8.5; dependency versions and npm package set unchanged. |
| `package-lock.json` | Modified | Version metadata 3.8.5; dependency versions and npm package set unchanged. |
| `package.json` | Modified | Version metadata 3.8.5; dependency versions and npm package set unchanged. |
| `scripts/test-theme-normalization.mjs` | Added | Regression coverage for semantic colors, accessibility contrast, route/version invariants. |
| `scripts/test-theme-system.mjs` | Modified | Regression coverage for semantic colors, accessibility contrast, route/version invariants. |
| `tsconfig.tsbuildinfo` | Added | Semantic presentation color replacement only; functional handlers unchanged. |
