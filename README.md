# 🧩 Team DB Setup – PostgreSQL + pgvector (Cách B: pgAdmin Desktop)

## 🎯 Mục tiêu

Thiết lập môi trường **PostgreSQL + pgvector** thống nhất cho cả nhóm, phục vụ module AI của đề tài.

- Dùng **Docker** để chạy PostgreSQL.
- Dùng **pgAdmin Desktop** để quản trị.
- Có sẵn schema, dữ liệu seed và hướng dẫn đồng bộ giữa các thành viên.

---

## 🧱 1. Yêu cầu hệ thống

| Phần mềm                | Bắt buộc | Ghi chú                              |
| ----------------------- | -------- | ------------------------------------ |
| Docker Desktop          | ✅       | chạy container Postgres              |
| pgAdmin 4 (Desktop App) | ✅       | quản lý DB (không cần bản container) |
| Git                     | ✅       | clone/pull code và migration scripts |
| PowerShell / Git Bash   | ✅       | chạy lệnh snapshot & migration       |

---

## 📁 2. Cấu trúc thư mục

```
project-root/
├─ docker-compose.yml
├─ .env.example
├─ .env                     # mỗi thành viên tự copy từ .env.example
├─ db/
│  ├─ init/                 # khởi tạo schema và seed
│  │  ├─ 00_extensions.sql
│  │  ├─ 01_schema_core_ai.sql
│  │  └─ 02_seed.sql
│  ├─ migrations/           # file thay đổi schema (PR-based)
│  └─ backup/               # dump/restore snapshot dữ liệu
```

---

## ⚙️ 3. Cấu hình `.env.example`

```env
# PostgreSQL (pgvector)
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=123456
POSTGRES_DB=career_ai
```

### Mỗi thành viên:

```bash
# Linux/macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

---

## 🐳 4. Cấu hình `docker-compose.yml`

```yaml
services:
  postgres:
    image: ankane/pgvector:latest
    container_name: careerai_postgres
    ports:
      - "${POSTGRES_PORT:-5433}:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-123456}
      POSTGRES_DB: ${POSTGRES_DB:-career_ai}
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-career_ai}",
        ]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  db_data:
```

---

## 🚀 5. Cách khởi động & truy cập DB

### 🔹 Khởi động Postgres

```bash
docker compose up -d
```

### 🔹 Dừng

```bash
docker compose stop
```

### 🔹 Reset sạch (xóa volume, chạy lại init scripts)

```bash
docker compose down -v && docker compose up -d
```

---

## 🧩 6. Kết nối qua **pgAdmin Desktop**

1. Mở **pgAdmin 4 (Desktop App)**.
2. Chọn **Create → Server…**
3. Điền:

   - **General → Name:** `career_ai_local`
   - **Connection:**

     - Host: `localhost`
     - Port: `5433`
     - Maintenance DB: `career_ai`
     - Username: `postgres`
     - Password: `123456`

4. Nhấn **Save** → mở **Schemas → core / ai** để xem cấu trúc.

> ✅ Không cần vào `http://localhost:5050` nữa (đó là bản container).
> Toàn nhóm dùng **pgAdmin Desktop** để thao tác DB.

---

## 💻 7. Chuỗi kết nối cho code

Trong `.env` của module AI hoặc backend:

```
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai
```

Python ví dụ:

```python
import os
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5433/career_ai")
```

---

## 🔁 8. G. Cập nhật & đồng bộ dữ liệu (Snapshot)

### 🧑‍💼 Leader export snapshot

_(chạy ở thư mục gốc repo)_

#### Linux/macOS/Git Bash:

```bash
docker compose exec -T postgres pg_dump -U postgres -d career_ai > db/backup/dev_snapshot.sql
```

#### Windows PowerShell:

```powershell
docker compose exec -T postgres pg_dump -U postgres -d career_ai > db/backup/dev_snapshot.sql
```

→ Tạo file `db/backup/dev_snapshot.sql`.
Commit lên repo (nếu nhỏ) hoặc chia sẻ qua Google Drive.

---

### 👥 Thành viên import snapshot

#### Linux/macOS/Git Bash:

```bash
cat db/backup/dev_snapshot.sql | docker compose exec -T postgres psql -U postgres -d career_ai
```

#### Windows PowerShell (2 cách, chọn 1):

```powershell
Get-Content db/backup/dev_snapshot.sql | docker compose exec -T postgres psql -U postgres -d career_ai
```

**hoặc**

```powershell
docker compose exec -T postgres psql -U postgres -d career_ai -f /dev/stdin < db/backup/dev_snapshot.sql
```

> 🎯 Mục đích: đảm bảo DB của tất cả thành viên giống hệt Leader.
> Dữ liệu sẽ được ghi đè (không ảnh hưởng schema).

---

Dưới đây là phiên bản **viết lại hoàn chỉnh, gọn và thống nhất**, dùng **script mới `scripts/apply_latest_migrations.ps1`** để áp dụng migration — đồng thời **bỏ mục 10, gộp vào mục 12** để hướng dẫn thành viên thao tác đúng chuẩn.

---

## 🧱 9. H. Quản lý schema & migration

### 🔹 Quy ước

- Mọi thay đổi **CSDL** (tạo/sửa bảng, index, enum, …) đều phải có file `.sql` trong thư mục `db/migrations/`.

- Đặt tên file theo mẫu:

  ```bash
  DD-MM-YYYY_add_table_or_index_name.sql
  ```

  > Ví dụ: `07-10-2025_add_index_on_career_embeddings.sql`

- **Không** đặt file migration trong `db/init/`
  (vì thư mục đó chỉ chạy khi khởi tạo DB mới với `docker compose down -v`).

---

### 🔹 Cách chạy migration

Sau khi **pull code mới nhất về**, có 2 lựa chọn:

#### ✅ Cách thủ công (chạy riêng từng file)

```bash
docker compose exec -T postgres psql -U postgres -d career_ai -f db/migrations/07-10-2025_add_index_on_career_embeddings.sql
```

#### 🚀 Cách tự động (dành cho tất cả thành viên)

Chạy script **tự động áp dụng toàn bộ migration mới** theo thứ tự ngày:

```powershell
pwsh -File scripts/apply_latest_migrations.ps1
```

> Script sẽ tự:
>
> - Kiểm tra container Postgres đang chạy (nếu chưa → bật)
> - Quét toàn bộ file `.sql` trong `db/migrations/`
> - Áp dụng tuần tự theo thứ tự tên (ví dụ: 01 → 02 → 03…)
> - Dừng lại khi có lỗi

---

## 🧮 10. Demo truy vấn vector (cosine)

```sql
WITH q AS (
  SELECT ARRAY(SELECT random()::real FROM generate_series(1,768))::vector(768) AS emb
)
SELECT c.title, 1 - (e.emb <=> q.emb) AS cosine_score
FROM ai.career_embeddings e
JOIN core.careers c ON c.id = e.career_id, q
ORDER BY e.emb <=> q.emb
LIMIT 5;
```

> Gợi ý: Sau khi có nhiều dữ liệu, nên chạy:
>
> ```sql
> ANALYZE ai.career_embeddings;
> SET ivfflat.probes = 10;
> ```
>
> để tăng recall của truy vấn vector.

---

## 📌 11. Tóm tắt nhanh cho thành viên mới

| Bước   | Việc cần làm                                                           | Lệnh chính / Hướng dẫn                                                                                    |
| ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **1️⃣** | Cài đặt Docker Desktop + pgAdmin Desktop                               | –                                                                                                         |
| **2️⃣** | Clone repo                                                             | `git clone https://github.com/<org>/NCKH.git`                                                             |
| **3️⃣** | Tạo file `.env` từ mẫu                                                 | `Copy-Item .env.example .env`                                                                             |
| **4️⃣** | Khởi động DB (Postgres + pgvector)                                     | `docker compose up -d`                                                                                    |
| **5️⃣** | Kết nối DB qua pgAdmin Desktop                                         | Host: `localhost`, Port: `5433`, DB: `career_ai`, User: `postgres`, Pass: `123456`                        |
| **6️⃣** | (Khi Leader export bản dữ liệu mới) Import snapshot                    | `Get-Content db/backup/dev_snapshot.sql \| docker compose exec -T postgres psql -U postgres -d career_ai` |
| **7️⃣** | (Khi có schema mới hoặc file migration mới) Áp dụng toàn bộ migrations | `pwsh -File scripts/apply_latest_migrations.ps1`                                                          |
| **8️⃣** | Kiểm tra log hoặc khởi động lại DB nếu cần                             | `docker compose logs -f postgres` / `docker compose restart postgres`                                     |
| **9️⃣** | (Tuỳ chọn) Reset sạch và khởi tạo lại DB                               | `docker compose down -v && docker compose up -d`                                                          |

---

> **Soạn bởi:** _Tran Chi Tho – Team CareerAI 2025_ > **Stack:** PostgreSQL + pgvector + Docker + pgAdmin Desktop
