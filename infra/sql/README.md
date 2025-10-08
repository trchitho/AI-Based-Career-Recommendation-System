Tham chiếu sang setUp_DB, có lệnh check nhanh DB.

# 📘 Hướng dẫn Database cho dự án NCKH

## 1. Nguồn database chính

Toàn bộ database của dự án **được quản lý độc lập** trong repo riêng:

E:\OneDrive\Desktop\setUp_DB

Repo đó chứa:

- `docker-compose.yml` → khởi tạo container `careerai_postgres` (port 5433)
- `db/init/*.sql` → schema & seed
- `db/migrations/*.sql` → cập nhật version
- `scripts/apply_latest_migrations.ps1` → apply migration tự động

---

## 2. Quick Start (chạy DB local)

```bash
cd E:\OneDrive\Desktop\setUp_DB
docker compose up -d


Port: 5433

DB name: career_ai

User: postgres

Pass: 123456

3. Kiểm tra DB & extension vector
# Check DB is ready
docker exec -it careerai_postgres psql -U postgres -d career_ai -c "SELECT now();"

# Check extension
docker exec -it careerai_postgres psql -U postgres -d career_ai -c "\dx"


Kết quả mong đợi:

               List of installed extensions
   Name    | Version |   Schema   |        Description
------------+---------+------------+----------------------------
 vector     | 0.5.1   | public     | OpenAI-compatible vector type

4. Snapshot (xuất/nhập dữ liệu)

Chạy trong repo setUp_DB:

# Export snapshot
docker compose exec -T postgres pg_dump -U postgres -d career_ai > db/backup/dev_snapshot.sql

# Import snapshot
Get-Content db/backup/dev_snapshot.sql | docker compose exec -T postgres psql -U postgres -d career_ai

5. Kết nối từ Backend
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai


Backend tự kiểm tra kết nối qua file app/core/db.py:

from sqlalchemy import create_engine, text
import os
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    print(conn.execute(text("SELECT now()")).scalar())
```
