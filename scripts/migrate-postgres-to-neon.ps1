[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDatabaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$TargetDatabaseUrl,

    [string]$BackupDirectory = (Join-Path $env:TEMP "career-ai-neon-migration"),

    [long]$MaxTargetBytes = 500000000,

    [switch]$CompactSource,

    [switch]$Force
)

$ErrorActionPreference = "Stop"
$appSchemas = @("core", "ai", "analytics", "chatbot", "interview")
$requiredExtensions = @("vector", "pg_trgm", "pgcrypto", "unaccent", "pg_session_jwt")
$largeTables = @(
    "core.career_ksas",
    "core.career_work_context",
    "core.career_work_activity_summary",
    "core.career_dwas",
    "core.career_technology",
    "core.career_work_activity_ratings",
    "core.career_outlook",
    "core.career_tasks",
    "ai.user_embeddings",
    "ai.retrieval_jobs_visbert",
    "ai.career_embeddings"
)

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

foreach ($command in @("psql", "pg_dump", "pg_restore")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required PostgreSQL command is unavailable: $command"
    }
}

if (-not $Force) {
    throw "This replaces public and application schemas in the target database. Re-run with -Force."
}

New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetBackup = Join-Path $BackupDirectory "neon-before-$timestamp.dump"
$publicSchemaDump = Join-Path $BackupDirectory "career-ai-public-$timestamp.dump"
$applicationDump = Join-Path $BackupDirectory "career-ai-application-$timestamp.dump"

if ($CompactSource) {
    foreach ($table in $largeTables) {
        Write-Host "Compacting $table"
        Invoke-Checked {
            & psql --dbname $SourceDatabaseUrl --set ON_ERROR_STOP=1 --quiet `
                --command "VACUUM (FULL, ANALYZE) $table;"
        } "Failed to compact $table"
    }
}

$sourceSizeText = & psql --dbname $SourceDatabaseUrl --tuples-only --no-align `
    --command "SELECT pg_database_size(current_database());"
if ($LASTEXITCODE -ne 0) {
    throw "Unable to read source database size."
}
$sourceSize = [long]$sourceSizeText.Trim()
if ($sourceSize -gt $MaxTargetBytes) {
    throw "Source database is $sourceSize bytes, above the configured target limit of $MaxTargetBytes bytes."
}

Write-Host "Backing up the current target database"
Invoke-Checked {
    & pg_dump --dbname $TargetDatabaseUrl --format custom --no-owner --no-acl `
        --file $targetBackup
} "Target backup failed."

Write-Host "Exporting public dependencies"
Invoke-Checked {
    & pg_dump --dbname $SourceDatabaseUrl --format custom --schema-only `
        --no-owner --no-acl --schema public --file $publicSchemaDump
} "Public dependency dump failed."

Write-Host "Exporting application schemas"
$schemaArguments = foreach ($schema in $appSchemas) {
    "--schema"
    $schema
}
Invoke-Checked {
    & pg_dump --dbname $SourceDatabaseUrl --format custom --no-owner --no-acl `
        @schemaArguments --file $applicationDump
} "Application schema dump failed."

$dropStatements = @(
    "SET statement_timeout = 0;"
    ($appSchemas | ForEach-Object { "DROP SCHEMA IF EXISTS $_ CASCADE;" })
    "DROP SCHEMA IF EXISTS public CASCADE;"
) -join [Environment]::NewLine

Write-Host "Replacing target schemas"
$dropStatements | & psql --dbname $TargetDatabaseUrl --set ON_ERROR_STOP=1 --quiet
if ($LASTEXITCODE -ne 0) {
    throw "Target schema reset failed. Restore from $targetBackup."
}

Invoke-Checked {
    & pg_restore --dbname $TargetDatabaseUrl --no-owner --no-acl `
        --exit-on-error --single-transaction $publicSchemaDump
} "Public dependency restore failed. Restore from $targetBackup."

$extensionStatements = @(
    "SET statement_timeout = 0;"
    ($requiredExtensions | ForEach-Object {
        "CREATE EXTENSION IF NOT EXISTS $_ WITH SCHEMA public;"
    })
) -join [Environment]::NewLine
$extensionStatements | & psql --dbname $TargetDatabaseUrl --set ON_ERROR_STOP=1 --quiet
if ($LASTEXITCODE -ne 0) {
    throw "Required extension creation failed. Restore from $targetBackup."
}

Invoke-Checked {
    & pg_restore --dbname $TargetDatabaseUrl --no-owner --no-acl `
        --exit-on-error --single-transaction --jobs 1 $applicationDump
} "Application restore failed. Restore from $targetBackup."

& psql --dbname $TargetDatabaseUrl --set ON_ERROR_STOP=1 --quiet `
    --command "ANALYZE;" 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Restore completed, but ANALYZE failed."
}

$expected = & psql --dbname $SourceDatabaseUrl --tuples-only --no-align --field-separator "|" `
    --command "SELECT table_schema, count(*) FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema IN ('core','ai','analytics','chatbot','interview') GROUP BY table_schema ORDER BY table_schema;"
$actual = & psql --dbname $TargetDatabaseUrl --tuples-only --no-align --field-separator "|" `
    --command "SELECT table_schema, count(*) FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema IN ('core','ai','analytics','chatbot','interview') GROUP BY table_schema ORDER BY table_schema;"

if ((Compare-Object $expected $actual).Count -ne 0) {
    throw "Target table counts do not match the source. Restore from $targetBackup if needed."
}

Write-Host "Migration completed and table counts match."
Write-Host "Rollback backup: $targetBackup"
