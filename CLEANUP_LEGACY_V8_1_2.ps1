$ErrorActionPreference = "Stop"
$Root = "D:\WEBSITE\harmony.app"

$LegacyFiles = @(
  "$Root\app\hr\leave\components\AnnualLeaveCyclesSection.tsx",
  "$Root\app\hr\leave\components\LeavePostponeSection.tsx",
  "$Root\app\hr\leave\components\LeaveRequestsSection.tsx",
  "$Root\app\hr\leave\components\LeaveTypesSection.tsx",
  "$Root\app\hr\attendance\approvals\[employeeId]\[period]\page.tsx.bak-20260917-151510"
)

foreach ($File in $LegacyFiles) {
  if (Test-Path -LiteralPath $File) {
    Remove-Item -LiteralPath $File -Force
    Write-Host "DELETED: $File"
  } else {
    Write-Host "SKIP (not found): $File"
  }
}

Write-Host "Legacy cleanup complete. .env.local was not changed."
