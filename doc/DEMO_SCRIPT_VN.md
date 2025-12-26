# 🎬 KỊCH BẢN DEMO - CAREERBRIDGE

## ⏱️ TỔNG THỜI GIAN: 30-45 phút

---

## 🚀 CHUẨN BỊ (5 phút trước demo)

### Khởi động hệ thống
```bash
# Terminal 1 - Backend
cd apps/backend && uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend  
cd apps/frontend && npm run dev
```

### Tài khoản demo
| Role | Email | Password |
|------|-------|----------|
| Free User | free@test.com | test123 |
| Pro User | pro@test.com | test123 |
| Admin | admin@test.com | admin123 |

---

## 📋 KỊCH BẢN DEMO

### PHẦN 1: LANDING PAGE (3 phút)
**URL**: `http://localhost:5173`

✅ **Điểm demo**:
- [ ] Hero section với animation
- [ ] Stats: 98% Success Rate, 10k+ Resumes
- [ ] Feature cards (Bento grid)
- [ ] Testimonials carousel
- [ ] Dark/Light mode toggle

**Nói**: *"CareerBridge là hệ thống gợi ý nghề nghiệp AI. Giao diện hiện đại, hỗ trợ dark mode."*

---

### PHẦN 2: ĐĂNG KÝ & ĐĂNG NHẬP (2 phút)

✅ **Điểm demo**:
- [ ] Form đăng ký
- [ ] Google OAuth button
- [ ] Validation messages

**Nói**: *"Đăng ký nhanh qua email hoặc Google. Hệ thống gửi email xác thực."*

---

### PHẦN 3: LÀM BÀI TEST (8 phút)
**URL**: `/assessment`

✅ **Điểm demo**:
- [ ] Intro screen với usage status
- [ ] Progress bar khi làm bài
- [ ] 60 câu hỏi (RIASEC + Big Five)
- [ ] Essay modal (optional)

**Nói**: *"Bài test gồm 60 câu, đánh giá sở thích nghề nghiệp (RIASEC) và tính cách (Big Five). Có thể viết thêm bài luận để AI phân tích sâu hơn."*

---

### PHẦN 4: KẾT QUẢ & GỢI Ý (5 phút)
**URL**: `/results/{id}`

✅ **Điểm demo**:
- [ ] RIASEC Radar Chart
- [ ] Big Five Bar Chart
- [ ] Top 3 Career Recommendations
- [ ] Match percentage

**Nói**: *"Kết quả hiển thị trực quan. AI gợi ý 3 nghề phù hợp nhất với độ match cao."*

---

### PHẦN 5: SUBSCRIPTION & PAYMENT (5 phút)
**URL**: `/pricing`

✅ **Điểm demo**:
- [ ] 4 gói: Free, Basic (99k), Premium (299k), Pro (499k)
- [ ] Feature comparison
- [ ] ZaloPay payment flow
- [ ] Payment success callback

**Nói**: *"4 gói dịch vụ phù hợp mọi nhu cầu. Thanh toán qua ZaloPay an toàn, kích hoạt ngay."*

---

### PHẦN 6: AI CHATBOT - PRO (7 phút)
**Đăng nhập**: `pro@test.com`

✅ **Điểm demo**:
- [ ] Chatbot floating button
- [ ] Hỏi: "Tôi nên học gì để trở thành Data Scientist?"
- [ ] Hỏi: "Lộ trình 6 tháng học Machine Learning"
- [ ] Tạo blog từ chat
- [ ] Lịch sử chat

**Nói**: *"AI Chatbot tích hợp Gemini, tư vấn 24/7. Có thể biến cuộc chat thành blog chia sẻ."*

---

### PHẦN 7: ROADMAP (3 phút)
**URL**: `/careers/{id}/roadmap`

✅ **Điểm demo**:
- [ ] 4 Levels: Beginner → Expert
- [ ] Skills mỗi level
- [ ] Resources gợi ý

**Nói**: *"Roadmap chi tiết 4 cấp độ, từ cơ bản đến chuyên gia. Gói Free chỉ xem Level 1."*

---

### PHẦN 8: ADMIN (3 phút)
**Đăng nhập**: `admin@test.com`
**URL**: `/admin`

✅ **Điểm demo**:
- [ ] Dashboard overview
- [ ] User management
- [ ] Content management

**Nói**: *"Admin có thể quản lý users, content, và xem thống kê hệ thống."*

---

## 🎯 KEY POINTS TO EMPHASIZE

1. **🤖 AI-Powered**: PhoBERT + Gemini cho phân tích chính xác
2. **👤 Personalized**: Kết quả cá nhân hóa theo RIASEC + Big Five
3. **📊 Comprehensive**: Test → Results → Roadmap → Chatbot
4. **💳 Flexible Pricing**: 4 gói phù hợp mọi nhu cầu
5. **🎨 Modern UX**: Responsive, Dark mode, Animations

---

## ❓ CÂU HỎI THƯỜNG GẶP

**Q: AI phân tích như thế nào?**
> A: Sử dụng PhoBERT cho NLP tiếng Việt, NeuMF cho ranking, và Gemini cho chatbot.

**Q: Dữ liệu có an toàn không?**
> A: Mã hóa JWT, HTTPS, không chia sẻ với bên thứ 3.

**Q: Có thể làm lại test không?**
> A: Có, tùy theo gói. Free: 5 lần/tháng, Premium: không giới hạn.

**Q: Chatbot có nhớ context không?**
> A: Có, lưu lịch sử và hiểu ngữ cảnh cuộc hội thoại.

---

## 🔧 TROUBLESHOOTING NHANH

| Lỗi | Fix |
|-----|-----|
| CORS error | Restart backend |
| 401 Unauthorized | Re-login |
| Payment stuck | Check ZaloPay sandbox |
| Chatbot no response | Check GEMINI_API_KEY |

---

*Good luck with your demo! 🚀*
