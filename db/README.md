## 1. Mục đích

Khác với repo `setUp_DB` (chuyên quản lý hạ tầng & schema của Postgres),
thư mục `db/` trong project `NCKH` chỉ chứa **các file phục vụ truy vấn và dữ liệu mẫu cho ứng dụng**.

---

## 2. Cấu trúc

| Thư mục              | Vai trò                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `queries/`           | Câu lệnh SQL mà backend hoặc AI-core có thể sử dụng để test hoặc debug          |
| `seed/`              | Dữ liệu nhỏ (JSON, CSV) dùng để kiểm thử tính năng, không phải seed schema thật |
| `logs/`              | (Tuỳ chọn) Ghi log truy vấn trong quá trình debug                               |
| `schema_preview.txt` | Ghi chú nhanh schema chính (core/ai/public) để dev tham khảo                    |

---

## 3. Phân biệt với repo `setUp_DB`

| Nơi         | Mục đích                                      | Có thay đổi schema không? |
| ----------- | --------------------------------------------- | ------------------------- |
| `setUp_DB/` | Khởi tạo Postgres, schema, migrations, backup | ✅ Có                     |
| `NCKH/db/`  | Câu truy vấn & dữ liệu nhỏ phục vụ BE/AI      | ❌ Không                  |

---

## 4. Lệnh test nhanh (gọi từ backend hoặc psql)

```bash
psql -U postgres -d career_ai -p 5433 -f db/queries/test_connection.sql
Hoặc trong Python:

python
Sao chép mã
from sqlalchemy import text
conn.execute(text(open("db/queries/test_connection.sql").read()))
5. Khi nào commit file mới vào đây?
Khi backend cần 1 query đặc thù (ví dụ: “tìm nghề tương tự bằng cosine similarity”)

Khi AI-core hoặc module retrieval muốn test SQL

Khi bạn tạo dữ liệu mẫu (JSON, CSV) cho demo dashboard hoặc test API

Không commit:

schema DDL (CREATE TABLE ...)

migrations

dump .sql lớn

6. Gợi ý thêm
Nếu team sau này cần benchmark hoặc kiểm thử, có thể thêm:

pgsql
Sao chép mã
db/benchmark/
├─ vector_search.sql
├─ recommendation_latency.sql
└─ notes.md
7. Tham chiếu
Database chính được quản lý tại:

makefile
Sao chép mã
E:\OneDrive\Desktop\setUp_DB
Khởi động bằng:

bash
Sao chép mã
cd E:\OneDrive\Desktop\setUp_DB
docker compose up -d
```
