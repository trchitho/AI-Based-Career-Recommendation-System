## 🧠 Team DB Setup — PostgreSQL + pgvector (Windows PowerShell Only)

> **Lưu ý:** Luôn chạy các lệnh ở **thư mục chứa `docker-compose.yml`** của dự án DB
> **Name local:** `career_ai_local`

---

### 1️⃣ Tạo file `.env` từ `.env.example`

```powershell
Copy-Item .env.example .env -Force
```

> Mặc định:
>
> ```
> Host name/Addres=localhost
> POSTGRES_PORT=5433
> POSTGRES_USER=postgres
> POSTGRES_PASSWORD=123456
> POSTGRES_DB=career_ai
> ```

---

### 2️⃣ Khởi động / Dừng / Reset Database

> **Lưu ý:** Chạy lệnh 1 để khởi động containers/Chạy lệnh 3 để reset containers

```powershell
# Start database containers
docker compose up -d
```

```powershell
# Stop containers
docker compose stop
```

```powershell
# Reset sạch (xóa volume, chạy lại init scripts)
docker compose down -v ; docker compose up -d
```

---

### 3️⃣ Biến môi trường cho ứng dụng (ví dụ: `packages/ai-core` hoặc `apps/backend`)

```powershell
# Trong cửa sổ PowerShell đang chạy app
# (ví dụ: E:\OneDrive\Desktop\ai-core)
$Env:DATABASE_URL = "postgresql://postgres:123456@localhost:5433/career_ai?sslmode=prefer&connect_timeout=10"
```

---

### 4️⃣ Áp dụng **migrations** (thay đổi schema)

```powershell
# Chạy script tự động áp dụng tất cả file .sql trong db\migrations
pwsh -File scripts\apply_latest_migrations.ps1
```

> Nếu bị chặn bởi policy:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\apply_latest_migrations.ps1
```

---

### 5️⃣ Đồng bộ dữ liệu team bằng **Snapshot (Chỉ chạy lệnh Import)**

#### 🟦 Export (Copy nguyên khối)

```powershell
# Tạo dump UTF-8 trực tiếp trong container
docker compose exec -T postgres bash -lc `
  "pg_dump -U postgres -d career_ai --no-owner --no-privileges --inserts --encoding=UTF8 > /tmp/dev_snapshot_utf8.sql"
# Copy file ra host
docker compose cp postgres:/tmp/dev_snapshot_utf8.sql db/backup/dev_snapshot_utf8.sql
```

---

#### 🟧 Import (Copy nguyên khối)

```powershell
# 1) Đá hết connection đang giữ DB
docker compose exec -T postgres psql -U postgres -d postgres -c `
"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='career_ai';"
# 2) Xoá DB cũ và tạo mới
docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS career_ai;"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE career_ai;"
# 3) Copy file dump vào container (nếu file nằm trên host)
docker compose cp db/backup/dev_snapshot_utf8.sql postgres:/tmp/dev_snapshot_utf8.sql
# 4) Import vào DB
docker compose exec -T postgres `
  psql -U postgres -d career_ai `
  -v ON_ERROR_STOP=1 `
  -f /tmp/dev_snapshot_utf8.sql
```

---

**Soạn bởi:** _Tran Chi Tho – Team CareerAI 2025_
**Stack:** PostgreSQL + pgvector + Docker + PowerShell (Windows)
