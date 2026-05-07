# 📊 BÁO CÁO CHI TIẾT DATABASE INTERVIEW SYSTEM

**Ngày tạo:** 2026-01-26  
**Hệ thống:** AI-Based Career Recommendation System  
**Schema:** interview  
**Tổng số bảng:** 10 bảng chính

---

## 🎯 TỔNG QUAN HỆ THỐNG

Hệ thống Interview Database được thiết kế để hỗ trợ **phỏng vấn AI thông minh** với khả năng:
- Phỏng vấn bằng văn bản (Text Interview)
- Phỏng vấn bằng giọng nói (Voice Interview) 
- Đánh giá và chấm điểm tự động
- Theo dõi hiệu suất và trải nghiệm người dùng
- Lưu trữ và phát lại cuộc phỏng vấn

---

## 📋 CHI TIẾT CÁC BẢNG VÀ CHỨC NĂNG

### 1. 🎤 **interview_sessions** - BẢNG TRUNG TÂM
**Chức năng:** Quản lý phiên phỏng vấn chính

**Nhiệm vụ:**
- Lưu trữ thông tin cơ bản của mỗi phiên phỏng vấn
- Theo dõi trạng thái phỏng vấn (active, completed, cancelled)
- Lưu kết quả đánh giá tổng thể (overall_score, technical_score, etc.)
- Quản lý chế độ phỏng vấn (text/voice)
- Theo dõi vi phạm quy tắc (tab_switch_count)

**Các cột quan trọng:**
```sql
- id: Khóa chính
- user_id: Người được phỏng vấn
- job_id, job_title: Vị trí ứng tuyển
- interview_mode: 'text' hoặc 'voice'
- evaluation_mode: 'immediate' hoặc 'deferred' (MỚI)
- evaluation_status: 'pending', 'in_progress', 'completed' (MỚI)
- tab_switch_count: Số lần chuyển tab (tối đa 10)
```

**Mối quan hệ:**
- **1-N** với `interview_messages` (1 session có nhiều tin nhắn)
- **1-N** với `interview_audio` (1 session có nhiều file audio)
- **1-N** với `ui_state_log` (1 session có nhiều trạng thái UI)
- **1-1** với `interview_feedback` (1 session có 1 feedback)

---

### 2. 💬 **interview_messages** - TIN NHẮN PHỎNG VẤN
**Chức năng:** Lưu trữ cuộc hội thoại phỏng vấn

**Nhiệm vụ:**
- Lưu từng tin nhắn trong cuộc phỏng vấn (câu hỏi AI + câu trả lời user)
- Chấm điểm từng câu trả lời (score, detailed_scores)
- Theo dõi thứ tự tin nhắn (order_index)
- Hỗ trợ voice interview (audio_url, voice_type, processing_time)

**Các cột quan trọng:**
```sql
- role: 'assistant' (AI) hoặc 'user' (người dùng)
- content: Nội dung tin nhắn
- audio_url: URL file audio cho tin nhắn này (MỚI)
- conversation_flow: Metadata luồng hội thoại (MỚI)
- word_timestamps: Timestamps cho karaoke effect
```

**Mối quan hệ:**
- **N-1** với `interview_sessions` (nhiều tin nhắn thuộc 1 session)
- **1-N** với `interview_audio` (1 tin nhắn có thể có nhiều file audio)

---

### 3. 🔊 **interview_audio** - QUẢN LÝ FILE AUDIO
**Chức năng:** Metadata cho các file audio trong voice interview

**Nhiệm vụ:**
- Lưu thông tin file audio (URL, kích thước, thời lượng)
- Phân loại audio (user_answer vs ai_question)
- Lưu transcript từ STT (Speech-to-Text)
- Liên kết với session và message tương ứng

**Các cột quan trọng:**
```sql
- audio_type: 'user_answer' hoặc 'ai_question'
- file_url: URL đến file audio trong Cloudflare R2
- transcript: Văn bản từ STT (chỉ cho user_answer)
- duration_seconds: Thời lượng audio
```

**Mối quan hệ:**
- **N-1** với `interview_sessions` (nhiều audio thuộc 1 session)
- **N-1** với `interview_messages` (audio có thể liên kết với message)

---

### 4. 🎵 **audio_cache** - CACHE TTS
**Chức năng:** Cache file audio từ Text-to-Speech

**Nhiệm vụ:**
- Tránh tạo lại audio cho cùng nội dung
- Tối ưu hiệu suất TTS
- Theo dõi tần suất sử dụng (access_count)
- Quản lý dung lượng cache

**Các cột quan trọng:**
```sql
- content_hash: Hash của nội dung text (UNIQUE)
- voice_type, voice_model: Loại giọng và model TTS
- audio_url: URL file audio đã cache
- access_count: Số lần truy cập
```

**Mối quan hệ:**
- **Độc lập** (không có foreign key trực tiếp)
- Được sử dụng bởi TTS service để tối ưu performance

---

### 5. 📊 **voice_performance_metrics** - METRICS HIỆU SUẤT
**Chức năng:** Theo dõi hiệu suất xử lý voice

**Nhiệm vụ:**
- Đo thời gian xử lý STT, AI, TTS
- Theo dõi tỷ lệ thành công/thất bại
- Phân tích bottleneck trong pipeline voice
- Tối ưu trải nghiệm người dùng

**Các cột quan trọng:**
```sql
- stage: 'stt', 'ai', 'tts', 'total'
- processing_time: Thời gian xử lý (seconds)
- success: Thành công hay thất bại
- input_size, output_size: Kích thước dữ liệu
```

**Mối quan hệ:**
- **N-1** với `interview_sessions` (nhiều metrics thuộc 1 session)

---

### 6. 🖥️ **ui_state_log** - LOG TRẠNG THÁI UI (MỚI)
**Chức năng:** Theo dõi trạng thái giao diện người dùng

**Nhiệm vụ:**
- Log các trạng thái UI trong voice interview
- Đo thời gian chờ của người dùng
- Phân tích trải nghiệm UX
- Tối ưu hiển thị loading states

**Các cột quan trọng:**
```sql
- state_type: 'processing_stt', 'processing_ai', 'processing_tts', 
              'waiting_user', 'playing_audio', 'recording_audio'
- state_value: Giá trị cụ thể của trạng thái
- duration_ms: Thời gian kéo dài (milliseconds)
- metadata_json: Thông tin bổ sung
```

**Mối quan hệ:**
- **N-1** với `interview_sessions` (nhiều UI states thuộc 1 session)

---

### 7. ⚙️ **voice_preferences** - CÀI ĐẶT GIỌNG NÓI
**Chức năng:** Lưu tùy chọn giọng nói của người dùng

**Nhiệm vụ:**
- Cá nhân hóa trải nghiệm voice interview
- Lưu giọng nói ưa thích (male/female)
- Điều chỉnh tốc độ, cao độ, âm lượng
- Hỗ trợ đa ngôn ngữ

**Các cột quan trọng:**
```sql
- preferred_voice: 'male' hoặc 'female'
- voice_rate: Tốc độ nói ('+0%', '+10%', etc.)
- voice_pitch: Cao độ giọng ('+0Hz', '+50Hz', etc.)
- voice_volume: Âm lượng (0.0 - 2.0)
```

**Mối quan hệ:**
- **1-1** với `core.users` (mỗi user có 1 preference)

---

### 8. 📝 **interview_templates** - MẪU CÂU HỎI
**Chức năng:** Quản lý template câu hỏi phỏng vấn

**Nhiệm vụ:**
- Lưu trữ mẫu câu hỏi theo job_id
- Phân loại theo skill và độ khó
- Cung cấp rubric chấm điểm
- Theo dõi hiệu quả sử dụng

**Các cột quan trọng:**
```sql
- question_template: Mẫu câu hỏi
- skill_category: Danh mục kỹ năng
- difficulty_level: Độ khó (easy, medium, hard)
- scoring_rubric: Tiêu chí chấm điểm
```

**Mối quan hệ:**
- **Độc lập** (được sử dụng để generate câu hỏi cho sessions)

---

### 9. 📄 **job_descriptions** - MÔ TẢ CÔNG VIỆC
**Chức năng:** Lưu trữ job description để phân tích

**Nhiệm vụ:**
- Parse và phân tích JD từ user
- Trích xuất skills, requirements
- Hỗ trợ tạo câu hỏi phù hợp
- Liên kết với career recommendation

**Các cột quan trọng:**
```sql
- raw_text: Nội dung JD gốc
- extracted_data: Dữ liệu đã parse (JSON)
- career_id: Liên kết với hệ thống career
- source: Nguồn JD (manual, upload, etc.)
```

**Mối quan hệ:**
- **N-1** với `core.users` (user có thể có nhiều JD)

---

### 10. 💭 **interview_feedback** - PHẢN HỒI
**Chức năng:** Thu thập feedback từ người dùng

**Nhiệm vụ:**
- Đánh giá chất lượng câu hỏi
- Feedback về độ chính xác AI
- Trải nghiệm tổng thể
- Cải thiện hệ thống

**Các cột quan trọng:**
```sql
- question_quality: Đánh giá chất lượng câu hỏi (1-5)
- ai_accuracy: Độ chính xác AI (1-5)
- overall_experience: Trải nghiệm tổng thể (1-5)
- comments, suggestions: Góp ý chi tiết
```

**Mối quan hệ:**
- **1-1** với `interview_sessions` (1 session có 1 feedback)
- **N-1** với `core.users` (user có thể có nhiều feedback)

---

## 🔗 SƠ ĐỒ QUAN HỆ GIỮA CÁC BẢNG

```
core.users (1) ←→ (N) interview_sessions (1) ←→ (N) interview_messages
     ↓                        ↓                           ↓
voice_preferences        interview_audio              [audio files]
     ↓                        ↓
[user settings]         voice_performance_metrics
                              ↓
                        ui_state_log (MỚI)
                              ↓
                        [UX tracking]

interview_sessions (1) ←→ (1) interview_feedback
interview_sessions ←→ job_descriptions (thông qua job_id)
interview_templates → [được sử dụng để tạo câu hỏi]
audio_cache → [tối ưu TTS performance]
```

---

## 🚀 LUỒNG HOẠT ĐỘNG CHÍNH

### 1. **Text Interview Flow:**
```
1. Tạo interview_session (mode='text')
2. Generate câu hỏi từ interview_templates
3. Lưu Q&A vào interview_messages
4. Chấm điểm immediate hoặc deferred
5. Thu thập interview_feedback
```

### 2. **Voice Interview Flow:**
```
1. Tạo interview_session (mode='voice')
2. Load voice_preferences của user
3. Generate câu hỏi → TTS → Cache vào audio_cache
4. Record user answer → STT → Lưu vào interview_audio
5. Log UI states vào ui_state_log
6. Track performance vào voice_performance_metrics
7. Lưu conversation vào interview_messages
8. Deferred evaluation sau khi hoàn thành
```

### 3. **Performance Monitoring:**
```
1. ui_state_log theo dõi trạng thái UI real-time
2. voice_performance_metrics đo hiệu suất processing
3. Phân tích bottleneck và tối ưu UX
```

---

## 📈 CÁC TÍNH NĂNG MỚI (2026-01-26)

### ✅ **Deferred Evaluation:**
- `evaluation_mode`: Chấm điểm ngay lập tức hoặc sau khi kết thúc
- `evaluation_status`: Theo dõi trạng thái chấm điểm
- `evaluation_results`: Lưu kết quả đánh giá chi tiết

### ✅ **UI State Tracking:**
- Bảng `ui_state_log` mới để theo dõi trạng thái giao diện
- Đo thời gian chờ của người dùng
- Tối ưu trải nghiệm voice interview

### ✅ **Enhanced Performance:**
- `user_experience_metrics`: Metrics trải nghiệm người dùng
- Tối ưu cache TTS với `audio_cache`
- Performance monitoring chi tiết

---

## 🎯 KẾT LUẬN

Database Interview System được thiết kế **modular và scalable** với:

**Ưu điểm:**
- ✅ Hỗ trợ đầy đủ text và voice interview
- ✅ Performance monitoring chi tiết
- ✅ UX tracking real-time
- ✅ Flexible evaluation system
- ✅ Comprehensive audio management
- ✅ User personalization

**Khả năng mở rộng:**
- 🚀 Hỗ trợ thêm ngôn ngữ mới
- 🚀 Integration với AI models khác
- 🚀 Advanced analytics và reporting
- 🚀 Multi-tenant support
- 🚀 Real-time collaboration

**Bảo mật và hiệu suất:**
- 🔒 Foreign key constraints đảm bảo data integrity
- ⚡ Indexes tối ưu cho performance
- 📊 Comprehensive logging và monitoring
- 🎯 Scalable architecture cho production

---

**Tổng kết:** Hệ thống database đã sẵn sàng cho production với đầy đủ tính năng interview AI thông minh, hỗ trợ cả text và voice, có khả năng monitoring và tối ưu trải nghiệm người dùng.