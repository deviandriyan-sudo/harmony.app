$ErrorActionPreference = "Stop"

$Root = "D:\WEBSITE\harmony.app"
$Out = Join-Path $Root "_HARMONY_FEATURE009_SOURCE_AUDIT"
$Zip = Join-Path $Root "HARMONY_FEATURE009_SOURCE_AUDIT_CURRENT.zip"

if (!(Test-Path $Root)) {
    throw "Project HARMONY tidak ditemukan di $Root"
}

if (Test-Path $Out) {
    Remove-Item $Out -Recurse -Force
}
New-Item -ItemType Directory -Path $Out | Out-Null

$Files = @(
    "app\hr\employees\page.tsx",
    "app\employee\leave\page.tsx",
    "lib\harmony-request-types.ts",
    "app\hr\leave\administration\page.tsx",
    "app\api\leave\types\route.ts",
    "app\api\hr\leave\request-types\route.ts"
)

foreach ($Relative in $Files) {
    $Source = Join-Path $Root $Relative
    if (!(Test-Path $Source)) {
        Write-Warning "Tidak ditemukan: $Relative"
        continue
    }

    $Destination = Join-Path $Out $Relative
    $DestinationDir = Split-Path $Destination -Parent
    New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
    Copy-Item $Source $Destination -Force
}

Push-Location $Root
try {
    "HEAD: $(git rev-parse HEAD)" | Out-File (Join-Path $Out "GIT_INFO.txt") -Encoding utf8
    "BRANCH: $(git branch --show-current)" | Out-File (Join-Path $Out "GIT_INFO.txt") -Encoding utf8 -Append
    "" | Out-File (Join-Path $Out "GIT_INFO.txt") -Encoding utf8 -Append
    "GIT STATUS:" | Out-File (Join-Path $Out "GIT_INFO.txt") -Encoding utf8 -Append
    git status --short | Out-File (Join-Path $Out "GIT_INFO.txt") -Encoding utf8 -Append
}
finally {
    Pop-Location
}

if (Test-Path $Zip) {
    Remove-Item $Zip -Force
}

Compress-Archive -Path "$Out\*" -DestinationPath $Zip -CompressionLevel Optimal

Write-Host ""
Write-Host "SELESAI"
Write-Host "Upload file ini ke ChatGPT:"
Write-Host $Zip
