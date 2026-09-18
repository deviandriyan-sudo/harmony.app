HARMONY V8.1.2 SAFE CANDIDATE

1. Copy ALL contents of this folder to:
   D:\WEBSITE\harmony.app

2. Choose Replace/Overwrite when Windows asks.

3. DO NOT delete or replace your existing .env.local.
   This package does not contain .env.local.

4. After copying, run in PowerShell from D:\WEBSITE\harmony.app:
   .\CLEANUP_LEGACY_V8_1_2.ps1

5. Then run:
   npm run build

6. If build fails: STOP. Do not push/deploy.
