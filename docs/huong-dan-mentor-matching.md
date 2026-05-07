# Hướng Dẫn Sử Dụng — Tính Năng Mentor Matching

> **Phiên bản:** 1.0 | **Cập nhật:** 2026-04-22

---

## Mục Lục

1. [Tổng quan](#1-tổng-quan)
2. [Tìm Mentor](#2-tìm-mentor)
3. [Gửi Yêu Cầu Kết Nối](#3-gửi-yêu-cầu-kết-nối)
4. [Trở Thành Mentor](#4-trở-thành-mentor)
5. [Nhắn Tin Real-time](#5-nhắn-tin-real-time)
6. [Mentor Trong Lộ Trình Học (Roadmap)](#6-mentor-trong-lộ-trình-học-roadmap)
7. [Mentor Trong Trang Nghề Nghiệp](#7-mentor-trong-trang-nghề-nghiệp)
8. [Lịch Sử Tin Nhắn](#8-lịch-sử-tin-nhắn)
9. [Giới Hạn Tính Năng](#9-giới-hạn-tính-năng)
10. [Câu Hỏi Thường Gặp](#10-câu-hỏi-thường-gặp)

---

## 1. Tổng Quan

**Mentor Matching** giúp bạn kết nối với những người có kinh nghiệm thực tế trong lĩnh vực nghề nghiệp bạn đang hướng tới. Hệ thống tự động tìm mentor phù hợp dựa trên:

| Tiêu chí | Trọng số |
|----------|----------|
| Kỹ năng phù hợp (skills match) | 60% |
| Ngành nghề tương đồng (career match) | 40% |
| Tính cách tương đồng — RIASEC & Big Five *(nếu có)* | 20% *(thay thế một phần)* |

> **Lưu ý quan trọng:** Tính năng này **chỉ hỗ trợ** gửi yêu cầu kết nối, nhắn tin và đặt lịch. Hệ thống **không** bao gồm gọi video trực tuyến (real-time video call).

---

## 2. Tìm Mentor

### 2.1 Truy Cập

Vào menu chính → chọn **"Mentor Matching"** → tab **"🎯 Tìm Mentor"**.

### 2.2 Hệ Thống Tự Động Điền Hồ Sơ

Khi bạn vào trang lần đầu, hệ thống **tự động** lấy thông tin từ:
- **CV đã upload** → kỹ năng hiện có (`current_skills`)
- **Kết quả đánh giá nghề nghiệp** → nghề mục tiêu (`target_career`)
- **Phân tích khoảng cách kỹ năng** → kỹ năng muốn học (`desired_skills`)

Nếu chưa có dữ liệu, bạn sẽ thấy form điền thủ công.

### 2.3 Điền Thủ Công (nếu cần)

Điền các trường sau rồi nhấn **"Lưu & Tìm Mentor"**:

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| Họ tên | Tên hiển thị của bạn | Nguyễn Văn A |
| Nghề nghiệp mục tiêu | Nghề bạn muốn theo | Software Developer |
| Kỹ năng hiện có | Nhập tag, nhấn **Enter** để thêm | Python, Excel |
| Kỹ năng muốn học | Kỹ năng bạn cần phát triển | React, SQL |

### 2.4 Đọc Kết Quả Matching

Mỗi thẻ mentor hiển thị:

```
┌─────────────────────────────────────┐
│  [Avatar]  Tên Mentor               │
│            Vị trí · Công ty         │
│                                     │
│  Kỹ năng: ██████████ 85%           │
│  Nghề:    ████████░░ 72%           │
│  Tính cách:███████░░░ 68%          │
│                                     │
│  ✓ Có chuyên môn về: Python, SQL   │
│  ✓ Kinh nghiệm liên quan           │
│                                     │
│  [Gửi yêu cầu kết nối]             │
└─────────────────────────────────────┘
```

- **Thanh xanh lá** = điểm kỹ năng
- **Thanh xanh dương** = điểm nghề nghiệp
- **Thanh tím** = điểm tính cách *(chỉ hiện khi cả hai bên có dữ liệu RIASEC/Big Five)*

---

## 3. Gửi Yêu Cầu Kết Nối

1. Nhấn nút **"Gửi yêu cầu"** trên thẻ mentor.
2. Viết tin nhắn giới thiệu bản thân *(tuỳ chọn, nhưng nên có)*.
3. Nhấn **"Gửi"**.

### 3.1 Theo Dõi Trạng Thái

Vào tab **"📋 Yêu cầu của tôi"** để xem danh sách:

| Badge | Nghĩa |
|-------|-------|
| 🟡 **Đang chờ** | Mentor chưa phản hồi |
| 🟢 **Đã chấp nhận** | Mentor đồng ý — bạn có thể nhắn tin |
| 🔴 **Đã từ chối** | Mentor không nhận thêm mentee lúc này |

> Mỗi mentor chỉ nhận **tối đa 5 mentee** cùng lúc. Nếu mentor đầy, nút gửi yêu cầu sẽ bị ẩn.

---

## 4. Trở Thành Mentor

### 4.1 Tự Động Tạo Hồ Sơ Mentor

Vào tab **"✨ Trở thành Mentor"** → nhấn **"✨ Tự động điền từ hồ sơ của tôi"**.

Hệ thống sẽ lấy:
- Kỹ năng từ **CV** và **các milestone đã hoàn thành** trong roadmap
- Ngành nghề từ **kết quả đánh giá**
- Điểm tính cách từ **bài kiểm tra RIASEC/Big Five**

### 4.2 Chỉnh Sửa Hồ Sơ

Sau khi tự động điền, bạn có thể chỉnh lại:

| Trường | Lưu ý |
|--------|-------|
| Vị trí hiện tại | Ghi rõ title, VD: "Frontend Developer" |
| Công ty | Có thể để trống |
| Giới thiệu (Bio) | Tóm tắt kinh nghiệm và phong cách mentor |
| Lĩnh vực chuyên môn | Thêm tag kỹ năng, nhấn **Enter** |
| Số giờ/tuần | Thời gian bạn có thể dành cho mentee |
| Số mentee tối đa | Mặc định 5 người |

### 4.3 Nhận Yêu Cầu

Khi có mentee gửi yêu cầu, bạn sẽ nhận **thông báo real-time** (nếu đang online) hoặc thấy trong tab **"📋 Yêu cầu của tôi"** (phía mentor).

Nhấn **"Chấp nhận"** hoặc **"Từ chối"** và có thể kèm lời nhắn phản hồi.

---

## 5. Nhắn Tin Real-time

### 5.1 Mở Chat

Có 3 cách mở chat với mentor/mentee:

| Từ đâu | Cách mở |
|--------|---------|
| Roadmap | Nhấn nút **"💬 Kết nối"** bên cạnh tên người đã hoàn thành |
| Trang nghề nghiệp | Nhấn tên mentor trong mục "Mentor cho nghề này" |
| Nút Messenger (góc phải màn hình) | Nhấn nút 💬 màu tím → chọn cuộc trò chuyện |

### 5.2 Giao Diện Chat

```
┌──────────────────────────────────┐
│ [TL]  thien le        [✕]       │  ← Header (nhấn ✕ để đóng)
│       Đang hoạt động            │
├──────────────────────────────────┤
│                                  │
│           [Tin nhắn cũ]         │
│                                  │
│  Xin chào! Tôi muốn học React  │  ← Tin của bạn (bên phải, màu xanh)
│                        [avatar] │
│                                  │
│ [avatar]                        │
│  Chào! Tôi có thể giúp bạn     │  ← Tin của mentor (bên trái)
│                                  │
├──────────────────────────────────┤
│ [Nhập tin nhắn...]    [➤ Gửi] │  ← Nhấn Enter hoặc nút Gửi
└──────────────────────────────────┘
```

- Tin nhắn xuất hiện **ngay lập tức** phía bạn gửi
- Phía nhận nhận được qua **WebSocket real-time** (nếu đang online)
- Nếu người nhận offline, tin vẫn được lưu và hiển thị khi họ mở lại

### 5.3 Phím Tắt

| Phím | Hành động |
|------|-----------|
| `Enter` | Gửi tin nhắn |
| `Shift + Enter` | Xuống dòng |
| `Esc` hoặc nhấn nền tối | Đóng chat |

---

## 6. Mentor Trong Lộ Trình Học (Roadmap)

Khi vào trang lộ trình của một nghề, phần **"Người đã hoàn thành lộ trình này"** sẽ hiển thị **top 5 người** đã hoàn thành các bước trong roadmap đó.

```
Người đã hoàn thành lộ trình này         [3 người]
──────────────────────────────────────────────────
[TL]  thien le                              95%
      Đã hoàn thành 3 bước lộ trình      [💬 Kết nối]
      Fundamentals · Tools & Workflow · Project

[NA]  nguyen anh                            78%
      Đã hoàn thành 2 bước lộ trình      [💬 Kết nối]
```

Nhấn **"💬 Kết nối"** để mở chat trực tiếp với họ.

> Điểm tương thích cao hơn = người đó đã hoàn thành nhiều bước hơn trong lộ trình.

---

## 7. Mentor Trong Trang Nghề Nghiệp

Trên trang chi tiết của từng nghề (Career Detail), có mục **"Mentor cho nghề này"**.

1. Nhấn để **mở rộng** danh sách mentor.
2. Xem tên, vị trí, kỹ năng phù hợp và điểm tương thích.
3. Nhấn **"Xem tất cả Mentor"** để đến trang Mentor Matching đầy đủ.

---

## 8. Lịch Sử Tin Nhắn

### 8.1 Nút Messenger Nổi (Floating Button)

Ở **góc phải dưới màn hình**, ngay phía trên nút chatbot AI:

- **Nút màu tím** 💬 = Messenger (tin nhắn với mentor/mentee)
- **Nút màu xanh** 🤖 = AI Career Chatbot

Nhấn nút tím để xem panel "Đoạn chat":

```
┌─────────────────────────┐
│ Đoạn chat          [✏] │
│ [🔍 Tìm kiếm...]       │
│ [Tất cả] [Chưa đọc]    │
├─────────────────────────┤
│ [TL] thien le      1 giờ│
│      Xin chào!       🔵 │
├─────────────────────────┤
│ [NA] nguyen anh  1 ngày │
│      Cảm ơn bạn!        │
└─────────────────────────┘
```

- **Chấm xanh** 🔵 = tin chưa đọc
- Tab **"Chưa đọc"** = lọc chỉ hiện hội thoại chưa đọc

### 8.2 Trong Trang Profile

Vào **Profile** → cuộn xuống cột trái → thấy khung **"Đoạn chat"** hiển thị toàn bộ lịch sử tin nhắn, tương tự giao diện Messenger.

---

## 9. Giới Hạn Tính Năng

| Tính năng | Hỗ trợ |
|-----------|--------|
| Gửi yêu cầu kết nối | ✅ |
| Nhắn tin văn bản real-time | ✅ |
| Lịch sử tin nhắn | ✅ |
| Thông báo tin nhắn mới | ✅ *(khi đang online)* |
| Chia sẻ file/hình ảnh | ❌ Chưa hỗ trợ |
| Gọi video / audio | ❌ Không hỗ trợ |
| Đặt lịch hẹn | ✅ Hỗ trợ (xác nhận bởi mentor) |
| Nhóm chat | ❌ Chưa hỗ trợ |

---

## 10. Câu Hỏi Thường Gặp

**Q: Tôi không thấy mentor nào được gợi ý?**
> Hệ thống cần biết bạn muốn học gì. Hãy vào tab "Tìm Mentor" và điền thông tin hồ sơ, hoặc hoàn thành bài đánh giá nghề nghiệp và upload CV để hệ thống tự động điền.

**Q: Điểm tương thích được tính thế nào?**
> Kỹ năng khớp chiếm 60%, nghề nghiệp chiếm 40%. Nếu cả hai bên có dữ liệu RIASEC/Big Five, tính cách chiếm thêm 20% (tổng được cân bằng lại).

**Q: Tôi có thể vừa là mentor vừa là mentee không?**
> Có. Hai vai trò độc lập. Vào tab "Trở thành Mentor" để đăng ký mentor, và tab "Tìm Mentor" để tìm người hướng dẫn cho bạn.

**Q: Mentor có biết tôi đã xem hồ sơ họ không?**
> Không. Mentor chỉ nhận thông báo khi bạn **gửi yêu cầu kết nối** hoặc **nhắn tin** cho họ.

**Q: Tại sao mentor tôi muốn kết nối bị ẩn nút gửi yêu cầu?**
> Mentor đó đã đạt số lượng mentee tối đa (mặc định 5 người). Hãy thử kết nối với mentor khác hoặc chờ họ có chỗ trống.

**Q: Tin nhắn của tôi có được lưu lại không?**
> Có. Tất cả tin nhắn được lưu trong hệ thống và hiển thị đầy đủ khi bạn mở lại cuộc trò chuyện.

**Q: Tôi không nhận được tin nhắn real-time?**
> Hãy kiểm tra kết nối internet. Nếu kết nối WebSocket lỗi, hệ thống sẽ tự động làm mới tin nhắn mỗi 3 giây.

---

*Mọi phản hồi hoặc báo lỗi, vui lòng liên hệ đội hỗ trợ qua trang Cài đặt → Liên hệ.*
