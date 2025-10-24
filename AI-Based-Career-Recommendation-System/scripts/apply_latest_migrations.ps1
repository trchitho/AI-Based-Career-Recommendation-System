# =====================================================================
# Apply all migration files (DD-MM-YYYY_*.sql) under db/migrations/
# Sequentially execute them inside the running Postgres container.
# Compatible with PowerShell on Windows.
# =====================================================================

Write-Host "🚀 Bắt đầu áp dụng các migration trong db/migrations..." -ForegroundColor Cyan


# Bảo đảm PowerShell/Console dùng UTF-8 không BOM khi pipe vào psql (tránh lỗi tiếng Việt)
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
[Console]::InputEncoding = $utf8NoBom

# 1️⃣ Cấu hình cơ bản
$ServiceName = "postgres"
$DbUser = "postgres"
$DbName = "career_ai"
$MigrationPath = "db/migrations"

# 2️⃣ Kiểm tra container PostgreSQL có đang chạy không
$container = docker compose ps -q $ServiceName
if (-not $container) {
  Write-Host "🐳 Container chưa chạy. Đang khởi động..." -ForegroundColor Yellow
  docker compose up -d $ServiceName
  Start-Sleep -Seconds 5
}

# 3️⃣ Lấy danh sách file .sql trong db/migrations theo thứ tự tên (DD-MM-YYYY)
$migrations = Get-ChildItem -Path $MigrationPath -Filter "*.sql" | Sort-Object Name

if ($migrations.Count -eq 0) {
  Write-Host "⚠️ Không có file .sql nào trong db/migrations/" -ForegroundColor Red
  exit
}

# 4️⃣ Chạy từng migration bằng pipeline (UTF-8 safe)
foreach ($file in $migrations) {
  Write-Host "`n📄 Đang chạy: $($file.Name)" -ForegroundColor Green

  # Dùng pipeline UTF-8, ép client_encoding UTF8 trước khi chạy nội dung file
  (
    "SET client_encoding TO 'UTF8';",
    (Get-Content -Raw -Encoding UTF8 $file.FullName)
  ) -join "`n" | docker compose exec -e PGCLIENTENCODING=UTF8 -T $ServiceName `
    psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1

  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Hoàn tất: $($file.Name)" -ForegroundColor Green
  } else {
    Write-Host "❌ Lỗi khi chạy: $($file.Name). Dừng script." -ForegroundColor Red
    exit 1
  }
}

Write-Host "`n🎯 Tất cả migrations đã được áp dụng thành công!" -ForegroundColor Cyan
