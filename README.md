# AI-Based Career Recommendation System

Hệ thống gợi ý nghề nghiệp cá nhân hóa sử dụng trí tuệ nhân tạo, được xây dựng theo kiến trúc monorepo với Frontend (React/Vite), Backend (FastAPI) và AI-Core (PhoBERT, vi-SBERT, NeuMF).

---

## Mục lục

1. [Giới thiệu](#giới-thiệu)
2. [Các gói dịch vụ](#các-gói-dịch-vụ)
3. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
4. [Cấu trúc thư mục](#cấu-trúc-thư-mục)
5. [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
6. [Cấu hình môi trường](#cấu-hình-môi-trường)
7. [Hướng dẫn test thanh toán](#hướng-dẫn-test-thanh-toán)
8. [Công nghệ sử dụng](#công-nghệ-sử-dụng)

---

## Giới thiệu

Hệ thống phân tích đặc điểm tính cách người dùng thông qua các bài kiểm tra RIASEC, Big Five và phân tích văn bản (essay) để đưa ra gợi ý nghề nghiệp phù hợp. Các thuật toán AI được sử dụng bao gồm:

- Phân tích văn bản với PhoBERT và vi-SBERT
- Vector search với pgvector (768 chiều)
- Xếp hạng nghề nghiệp với NeuMF/MLP
- Tối ưu hóa gợi ý theo thời gian thực với Thompson Sampling

---

## Các gói dịch vụ

Hệ thống cung cấp 4 gói dịch vụ với các tính năng khác nhau:

**Free (Miễn phí)**
- Giới hạn 5 bài kiểm tra mỗi tháng
- Xem được 1 nghề nghiệp gợi ý
- Lộ trình học tập cấp độ 1
- Chatbot hỗ trợ cơ bản

**Basic (99.000đ)**
- Giới hạn 20 bài kiểm tra mỗi tháng
- Xem được 5 nghề nghiệp mỗi tháng
- Lộ trình học tập cấp độ 1-2
- Phân tích chi tiết RIASEC và Big Five

**Premium (199.000đ)**
- Không giới hạn bài kiểm tra
- Xem toàn bộ danh mục nghề nghiệp
- Lộ trình học tập đầy đủ tất cả cấp độ
- Báo cáo phân tích AI chi tiết

**Pro (299.000đ)**
- Bao gồm tất cả tính năng Premium
- Trợ lý AI hỗ trợ 24/7 (tích hợp Gemini API)
- Xuất báo cáo PDF chuyên sâu
- So sánh lịch sử phát triển cá nhân
- Nhập liệu bằng giọng nói và đọc văn bản
- Tạo bài viết blog từ cuộc trò chuyện

---

## Kiến trúc hệ thống

```
Frontend (React + Vite)
        |
        | HTTP Request qua /bff/*
        v
Backend (FastAPI BFF + Modules)
        |
        | Internal API Call
        v
AI-Core Service (PhoBERT, vi-SBERT, NeuMF)
        |
        v
PostgreSQL + pgvector
```

Frontend giao tiếp với Backend thông qua các endpoint BFF (Backend For Frontend). Backend điều phối các request đến AI-Core service và database.

---

## Cấu trúc thư mục

```
AI-Based-Career-Recommendation-System/
|
|-- apps/
|   |-- backend/              # FastAPI server
|   |   |-- app/
|   |   |   |-- main.py
|   |   |   |-- bff/          # Backend For Frontend endpoints
|   |   |   |-- core/         # Config, database, authentication
|   |   |   |-- modules/      # Các module nghiệp vụ
|   |   |   |   |-- auth/
|   |   |   |   |-- users/
|   |   |   |   |-- assessments/
|   |   |   |   |-- payment/
|   |   |   |   |-- recommendation/
|   |   |   |   |-- ...
|   |   |-- requirements.txt
|   |
|   |-- frontend/             # React application
|       |-- src/
|       |   |-- components/
|       |   |-- pages/
|       |   |-- services/
|       |   |-- contexts/
|       |-- package.json
|
|-- packages/
|   |-- ai-core/              # AI service (port 9000)
|       |-- src/
|           |-- ai_core/
|           |   |-- nlp/
|           |   |-- retrieval/
|           |   |-- recsys/
|           |-- api/
|
|-- db/
|   |-- init/                 # Database initialization scripts
|
|-- doc/                      # Tài liệu dự án
|
|-- README.md
```

---

## Hướng dẫn cài đặt

Cần mở 3 terminal để chạy đồng thời 3 service.

**Terminal 1: AI-Core Service (port 9000)**

```bash
cd packages/ai-core
pip install -r requirements.txt
uvicorn src.api.main:app --reload --port 9000
```

**Terminal 2: Backend (port 8000)**

```bash
cd apps/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run_dev.py
```

**Terminal 3: Frontend (port 3000)**

```bash
cd apps/frontend
npm install
npm run dev
```

Sau khi chạy xong, truy cập http://localhost:3000 để sử dụng ứng dụng.

---

## Cấu hình môi trường

Tạo file .env trong thư mục apps/backend với nội dung sau:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/career_ai
AI_CORE_BASE=http://localhost:9000
ALLOWED_ORIGINS=http://localhost:3000
SECRET_KEY=your_secret_key

VNPAY_TMN_CODE=CGXZLS0Z
VNPAY_HASH_SECRET=XNBCJFAKAZQSGTARRLGCHVZWCIOIGSHN

ZALOPAY_APP_ID=2553
ZALOPAY_KEY1=PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL
ZALOPAY_KEY2=kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz

GEMINI_API_KEY=your_gemini_api_key
```

---

## Hướng dẫn test thanh toán

Hệ thống tích hợp 2 cổng thanh toán VNPay và ZaloPay ở chế độ sandbox để test.

**VNPay Sandbox**

Thẻ ATM ngân hàng NCB:
- Ngân hàng: NCB
- Số thẻ: 9704198526191432198
- Tên chủ thẻ: NGUYEN VAN A
- Ngày phát hành: 07/15
- Mã OTP: 123456

Thẻ ATM ngân hàng Vietcombank:
- Ngân hàng: Vietcombank
- Số thẻ: 9704366614626746
- Tên chủ thẻ: NGUYEN VAN A
- Ngày phát hành: 07/15
- Mã OTP: 123456

Thẻ quốc tế Visa:
- Loại thẻ: Visa
- Số thẻ: 4111111111111111
- Tên chủ thẻ: NGUYEN VAN A
- Ngày hết hạn: 12/25
- Mã CVV: 123

**ZaloPay Sandbox**

Thẻ quốc tế Visa:
- Loại thẻ: Visa
- Số thẻ: 4111111111111111
- Tên chủ thẻ: TEST
- Ngày hết hạn: 12/25
- Mã CVV: 123

---

## Công nghệ sử dụng

**Frontend**
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

**Backend**
- FastAPI
- SQLAlchemy
- PostgreSQL
- pgvector
- JWT Authentication

**AI-Core**
- PhoBERT
- vi-SBERT
- NeuMF
- FAISS

**Thanh toán**
- VNPay
- ZaloPay

---

## Liên hệ

Mọi thắc mắc về dự án vui lòng liên hệ qua email hoặc tạo issue trên repository.
