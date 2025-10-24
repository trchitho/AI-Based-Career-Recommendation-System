# 🧩 Backend – Careers Page (Phase MNM ETL)

**Branch:** `feat/be_careers_page`  
**Trạng thái:** ✅ Hoàn tất giai đoạn ETL MNM (Mini Model) cho trang **See More** trong hệ thống Career Recommendation.

---

## 1️⃣ Mục tiêu

Xây dựng **API backend** để hiển thị thông tin chi tiết nghề nghiệp ("See more") từ dữ liệu **O\*NET Mini Model (MNM)**, lưu vào PostgreSQL, và phục vụ cho **FE `/careers/[id]`**.

---

## 2️⃣ Thành phần chính

| Module                    | Vai trò                                   | Ghi chú                                   |
| ------------------------- | ----------------------------------------- | ----------------------------------------- |
| `app/services/onetsvc.py` | HTTP client MNM                           | Có retry, backoff, xử lý 422/404 optional |
| `app/etl/onet_loader.py`  | ETL MNM → PostgreSQL                      | Nạp toàn bộ 1 016 nghề từ `core.careers`  |
| `app/api/bff_career.py`   | API BFF `/bff/catalog/career/{onet_code}` | Cung cấp dữ liệu See More cho FE          |

---

## 3️⃣ Các bảng đã có dữ liệu (từ MNM)

| Nhóm nội dung                   | Bảng                     | Ghi chú                                          |
| ------------------------------- | ------------------------ | ------------------------------------------------ |
| Header                          | `core.careers`           | `title_en`, `short_desc_en` đã chuẩn hóa         |
| Tasks (Summary)                 | `core.career_tasks`      | ≥ 5 task/nghề, fallback từ `what_they_do`        |
| Technology Skills               | `core.career_technology` | Có `category`, `example`, `hot_flag`             |
| Worker Characteristics          | `core.career_ksas`       | `Knowledge / Skills / Abilities` (rating = NULL) |
| Job Zone / Education / Training | `core.career_prep`       | Có 3 cột `job_zone`, `education`, `training`     |
| Interests (RIASEC)              | `core.career_interests`  | One-hot từ `top_interest`                        |
| Outlook                         | `core.career_outlook`    | `summary_md`, `growth_label`, `openings_est`     |

> ✅ Tổng cộng 7 bảng đầy đủ → đủ cho FE hiển thị các box:  
> **Summary**, **Technology**, **Skills/Knowledge/Abilities**, **Education/Training**, **Interests**, **Outlook**.

---

## 4️⃣ Các bảng chưa có dữ liệu (sẽ được bổ sung ở Phase 2 – O\*NET Online)

| Bảng                          | Nội dung                              | Nguồn kế tiếp                                |
| ----------------------------- | ------------------------------------- | -------------------------------------------- |
| `core.career_work_activities` | Work Activities (5–10 dòng)           | O\*NET Online → `/ws/online/work_activities` |
| `core.career_dwas`            | Detailed Work Activities (DWAs)       | O\*NET Online → `/ws/online/dwa`             |
| `core.career_work_context`    | Work Context (môi trường làm việc)    | O\*NET Online → `/ws/online/work_context`    |
| `core.career_education_pct`   | % phân bổ trình độ học vấn trung bình | O\*NET Online → `/ws/online/education`       |
| `core.career_wages_us`        | Mức lương trung vị (US – BLS)         | CareerOneStop / BLS API (sau)                |

---

## 5️⃣ Kết quả và tình trạng

- ETL MNM đã chạy thành công cho **toàn bộ 1 016 nghề**.
- CSDL PostgreSQL ổn định, sẵn sàng export snapshot.
- `BFF` phục vụ đầy đủ cho FE **See More tab**.
- **Phase MNM hoàn tất** → có thể chuyển sang HYBRID/ONLINE.

---

## 6️⃣ Hướng phát triển kế tiếp (Phase 2 – O\*NET Online Hybrid)

1. Tạo các bảng **Online-only** (Work Activities, DWAs, Work Context, Education %).
2. Viết `OnetOnlineService` và `OnetHybridService`.
3. Viết `etl/onet_online_loader.py` – nạp OnLine và enrich dữ liệu.
4. Bật chế độ `ONET_MODE=HYBRID` trong `.env` để thử nghiệm.
