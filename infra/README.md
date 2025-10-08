# ⚙️ Infrastructure Overview — AI-Based Career Recommendation System

## 1. Mục đích

Thư mục `infra/` chứa **mô tả hạ tầng và cấu hình triển khai** của dự án NCKH.

Trong giai đoạn **MVP**, thư mục này **không bắt buộc chạy** mà chỉ để:

- chuẩn hoá môi trường cho team (DevOps structure),
- ghi lại cách khởi tạo DB, snapshot, CI/CD, và hướng dẫn deploy.

---

## 2. Cấu trúc

infra/
├─ docker-compose.dev.yml # compose FE+BE (DB chạy ở setUp_DB)
├─ sql/ # tham chiếu DB, queries test
├─ k8s/ # manifest mẫu cho deployment
└─ README.md # tài liệu tổng thể

yaml
Sao chép mã

---

## 3. Database

DB chạy độc lập trong repo `setUp_DB`:

E:\OneDrive\Desktop\setUp_DB

bash
Sao chép mã

Chạy lệnh:

```bash
cd setUp_DB
docker compose up -d
→ Service: careerai_postgres
→ Port: 5433
→ DB URL:

bash
Sao chép mã
postgresql://postgres:123456@localhost:5433/career_ai
4. Docker Compose Dev (FE + BE)
Khi muốn chạy app qua Docker:

bash
Sao chép mã
cd infra
docker compose -f docker-compose.dev.yml up -d
Hiện tại chỉ là placeholder — không cần chạy trong giai đoạn MVP.

5. Kubernetes
Thư mục infra/k8s/ chứa manifest mẫu cho giai đoạn triển khai sau MVP.
Không cần áp dụng ngay, nhưng nên giữ để CI/CD chuẩn hóa sau này.

6. CI/CD (sẽ thêm sau)
fe-ci.yml, be-ci.yml trong .github/workflows/

kiểm tra lint, build, test tự động trên nhánh main.

7. Tóm tắt
Thành phần	Giai đoạn	Mục đích
infra/sql	MVP	Chứa hướng dẫn connect DB
infra/docker-compose.dev.yml	Staging	Chạy FE/BE container
infra/k8s	Post-MVP	Triển khai Kubernetes
setUp_DB	MVP	Chạy & quản lý DB thực tế
```
