param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot "..\..\..\database\AI-Based-Career-Recommendation-System"),
  [string]$TargetRoot = (Join-Path $PSScriptRoot "..\AI-Based-Career-Recommendation-System"),
  [switch]$DryRun
)

if (-not (Test-Path $SourceRoot)) { Write-Error "Source not found: $SourceRoot"; exit 1 }
if (-not (Test-Path $TargetRoot)) { New-Item -ItemType Directory -Path $TargetRoot | Out-Null }

$reportDir = Join-Path $TargetRoot "merge_reports"
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$report = Join-Path $reportDir "merge_$stamp.txt"

$copied = 0; $skippedSame = 0; $addedDiff = 0; $createdDirs = 0
$srcFiles = Get-ChildItem -Path $SourceRoot -Recurse -File

"# Merge Report $stamp" | Out-File -Encoding UTF8 $report
"Source: $SourceRoot" | Out-File -Append -Encoding UTF8 $report
"Target: $TargetRoot" | Out-File -Append -Encoding UTF8 $report
"" | Out-File -Append -Encoding UTF8 $report

foreach ($f in $srcFiles) {
  $rel = $f.FullName.Substring($SourceRoot.Length).TrimStart('\\','/')
  $target = Join-Path $TargetRoot $rel
  $targetDir = Split-Path $target
  if (-not (Test-Path $targetDir)) {
    if (-not $DryRun) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
    $createdDirs++
  }

  if (-not (Test-Path $target)) {
    if (-not $DryRun) { Copy-Item -Path $f.FullName -Destination $target -Force }
    $copied++
    "ADD NEW: $rel" | Out-File -Append -Encoding UTF8 $report
  }
  else {
    $h1 = (Get-FileHash -Path $f.FullName -Algorithm SHA256).Hash
    $h2 = (Get-FileHash -Path $target -Algorithm SHA256).Hash
    if ($h1 -eq $h2) {
      $skippedSame++
      "SAME: $rel" | Out-File -Append -Encoding UTF8 $report
    } else {
      $incoming = "$target.incoming"
      if (-not $DryRun) { Copy-Item -Path $f.FullName -Destination $incoming -Force }
      $addedDiff++
      $incomingLeaf = Split-Path -Path $incoming -Leaf
      "DIFF: $rel -> $incomingLeaf" | Out-File -Append -Encoding UTF8 $report
    }
  }
}

"" | Out-File -Append -Encoding UTF8 $report
"Summary: New=$copied, Same=$skippedSame, DiffAdded=$addedDiff, Dirs=$createdDirs" | Out-File -Append -Encoding UTF8 $report
Write-Host "Summary: New=$copied, Same=$skippedSame, DiffAdded=$addedDiff, Dirs=$createdDirs" -ForegroundColor Green
Write-Host "Report: $report" -ForegroundColor Cyan
