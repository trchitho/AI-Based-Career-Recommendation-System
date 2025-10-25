param(
  [Parameter(Mandatory = $true)] [string]$File,
  [string]$Host = "localhost",
  [int]$Port = 5433,
  [string]$Database = "career_ai",
  [string]$User = "postgres",
  [string]$Password = "123456",
  [string]$Schema = "core"  # default to core; set to 'public' if your dump expects it
)

if (-not (Test-Path $File)) {
  Write-Error "Backup file not found: $File"; exit 1
}

# Ensure UTF-8 (Vietnamese content)
try { chcp 65001 | Out-Null } catch {}

$env:PGPASSWORD = $Password
$env:PGCLIENTENCODING = "UTF8"
Write-Host "➡ Importing backup into $Database@$Host:$Port as $User (search_path=$Schema,public)" -ForegroundColor Cyan

# Create a wrapper SQL that sets search_path then includes the file
$resolved = (Resolve-Path $File).Path
$escaped = $resolved.Replace("'", "''")
$tempWrapper = Join-Path $env:TEMP ("restore_" + [IO.Path]::GetFileNameWithoutExtension($resolved) + "_" + (Get-Date -Format 'yyyyMMddHHmmss') + ".sql")
$wrapperContent = @(
  "SET client_min_messages TO WARNING;",
  "SET search_path = $Schema, public;",
  "\\encoding 'UTF8'",
  "\\i '$escaped'"
) -join "`n"
Set-Content -Path $tempWrapper -Value $wrapperContent -Encoding utf8

# Call psql and stream output so errors are visible
$args = @(
  "-h", $Host,
  "-p", $Port,
  "-U", $User,
  "-d", $Database,
  "-v", "ON_ERROR_STOP=1",
  "-f", $tempWrapper
)

& psql @args
$exit = $LASTEXITCODE
Remove-Item -ErrorAction SilentlyContinue $tempWrapper
if ($exit -ne 0) {
  Write-Error "Restore failed with exit code $exit"; exit $exit
}

Write-Host "✅ Restore completed" -ForegroundColor Green
