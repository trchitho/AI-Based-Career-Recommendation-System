# =====================================================================
# Apply all migration files (DD-MM-YYYY_*.sql) under db/migrations/
# Sequentially execute them inside the running Postgres container.
# Compatible with PowerShell on Windows.
# =====================================================================

Write-Host "🚀 Bắt đầu áp dụng các migration trong db/migrations..." -ForegroundColor Cyan

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

# 4️⃣ Chạy từng migration bằng pipeline (PowerShell-compatible)
foreach ($file in $migrations) {
  Write-Host "`n📄 Đang chạy: $($file.Name)" -ForegroundColor Green

  # Dùng pipeline Get-Content để truyền nội dung file vào container
  Get-Content -Raw $file.FullName | docker compose exec -T $ServiceName `
    psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1

  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Hoàn tất: $($file.Name)" -ForegroundColor Green
  } else {
    Write-Host "❌ Lỗi khi chạy: $($file.Name). Dừng script." -ForegroundColor Red
    exit 1
  }
}

Write-Host "`n🎯 Tất cả migrations đã được áp dụng thành công!" -ForegroundColor Cyan
