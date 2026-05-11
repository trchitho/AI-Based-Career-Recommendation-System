# 🎙️ Voice Interview Setup Guide

Hướng dẫn setup và chạy tính năng Voice Interview (Phỏng vấn giọng nói) cho thành viên mới.

---

## 📋 Mục Lục

1. [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
2. [Cài Đặt Dependencies](#cài-đặt-dependencies)
3. [Cấu Hình API Keys](#cấu-hình-api-keys)
4. [Chạy Ứng Dụng](#chạy-ứng-dụng)
5. [Test Voice Interview](#test-voice-interview)
6. [Troubleshooting](#troubleshooting)

---

## 🖥️ Yêu Cầu Hệ Thống

### Backend
- **Python**: 3.11+
- **PostgreSQL**: 14+
- **Neo4j**: 5.0+
- **Redis**: 7.0+ (optional)

### Frontend
- **Node.js**: 18+
- **npm**: 9+

### Hardware
- **Microphone**: Bắt buộc (built-in hoặc external)
- **Speakers/Headphones**: Bắt buộc
- **RAM**: Tối thiểu 8GB (khuyến nghị 16GB)
- **Internet**: Tốc độ tối thiểu 5 Mbps

---

## 📦 Cài Đặt Dependencies

### 1. Clone Repository

```bash
git clone <repository-url>
cd AI-Based-Career-Recommendation-System
```

### 2. Backend Setup

```bash
cd apps/backend

# Tạo virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install additional voice interview dependencies
pip install edge-tts websockets deepgram-sdk faster-whisper
```

### 3. Frontend Setup

```bash
cd apps/frontend

# Install dependencies
npm install

# Install additional dependencies (nếu cần)
npm install @types/react @types/react-dom
```

---

## 🔑 Cấu Hình API Keys

### 1. Tạo File `.env`

Copy file `.env.example` thành `.env`:

```bash
cd apps/backend
cp .env.example .env
```

### 2. Cấu Hình API Keys

Mở file `.env` và cập nhật các keys sau:

#### **A. Gemini API Keys** (Bắt buộc)

Tạo API keys từ: https://makersuite.google.com/app/apikey

```env
# Interview API Key (cho AI Mock Interview)
GEMINI_INTERVIEW_API_KEY=your_gemini_api_key_here

# Analysis API Key (cho phân tích câu trả lời)
GEMINI_ANALYSIS_API_KEY=your_gemini_api_key_here
GEMINI_ANALYSIS_MODEL=gemini-2.5-flash
```

**Lưu ý**: Nên tạo 2 API keys riêng biệt để tránh vượt quota.

#### **B. Deepgram API Key** (Bắt buộc cho STT)

Tạo tài khoản miễn phí tại: https://console.deepgram.com/signup

- Free tier: $200 credit
- Không cần credit card

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

**Cách lấy Deepgram API Key**:
1. Đăng ký tại https://console.deepgram.com/signup
2. Verify email
3. Vào **API Keys** → **Create a New API Key**
4. Đặt tên: "Voice Interview STT"
5. Permissions: Chọn "Member"
6. Copy key (chỉ hiển thị 1 lần!)

#### **C. Database Configuration**

```env
# PostgreSQL
DATABASE_URL=postgresql://postgres:123456@localhost:5433/career_ai

# Neo4j
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=CareerAI2026!

# Redis (optional)
REDIS_URL=redis://localhost:6379/0
```

#### **D. JWT Secret**

```env
JWT_SECRET_KEY=careerai-super-secret-key-2024-32bytes!!
```

#### **E. Voice Interview Settings**

```env
# Edge TTS (Text-to-Speech)
EDGE_TTS_ENABLED=true

# Whisper STT (Speech-to-Text fallback)
WHISPER_MODEL_SIZE=base
# Options: tiny, base, small, medium, large

# Audio Settings
MAX_AUDIO_FILE_SIZE_MB=25
MAX_AUDIO_DURATION_SECONDS=300

# Voice Interview Features
VOICE_INTERVIEW_ENABLED=true
DEFAULT_VOICE_PREFERENCE=female
MAX_TAB_SWITCHES=3
```

---

## 🚀 Chạy Ứng Dụng

### 1. Start Database Services

#### PostgreSQL
```bash
# Windows (nếu dùng Docker):
docker run -d --name careerai_postgres -p 5433:5432 -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=career_ai postgres:14

# Hoặc start PostgreSQL service đã cài
```

#### Neo4j
```bash
# Windows (nếu dùng Docker):
docker run -d --name careerai_neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/CareerAI2026! neo4j:5.0

# Hoặc start Neo4j Desktop
```

### 2. Start Backend

```bash
cd apps/backend

# Activate virtual environment
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Run migrations (nếu cần)
alembic upgrade head

# Start server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend sẽ chạy tại: http://localhost:8000

### 3. Start Frontend

```bash
cd apps/frontend

# Start development server
npm run dev
```

Frontend sẽ chạy tại: http://localhost:3000

---

## 🧪 Test Voice Interview

### 1. Test Deepgram STT

Mở browser và truy cập:
```
http://localhost:3000/dg-test.html
```

**Test steps**:
1. Click "▶ Bắt đầu"
2. Cho phép microphone access
3. Nói thử: "Xin chào, tôi là [tên bạn]"
4. Kiểm tra transcript có hiển thị đúng không

**Expected result**:
- ✅ "Deepgram ready ✓" trong logs
- ✅ Transcript hiển thị real-time khi nói
- ✅ Text màu trắng (final) và màu xám (interim)

### 2. Test Voice Interview Flow

1. **Đăng nhập**: http://localhost:3000/login
2. **Vào Interview**: Menu → "Phỏng vấn" → "Phỏng vấn giọng nói"
3. **Chọn job**: Chọn công việc muốn phỏng vấn
4. **Device test**: 
   - Test microphone
   - Test speakers
   - Chọn giới tính AI (Nam/Nữ)
5. **Đọc quy tắc**: Đọc và đồng ý quy tắc
6. **Bắt đầu phỏng vấn**:
   - Đợi AI hỏi câu hỏi
   - Click mic để trả lời
   - Nói câu trả lời
   - Click stop khi xong

**Expected behavior**:
- ✅ Loading spinner khi load câu hỏi
- ✅ Text và audio bắt đầu đồng thời
- ✅ Live transcript hiển thị khi nói
- ✅ Có thể edit transcript trước khi submit
- ✅ Chuyển sang câu hỏi tiếp theo

---

## 🐛 Troubleshooting

### Vấn Đề 1: Transcript Không Hiển Thị

**Triệu chứng**: Chỉ thấy "Đang nghe..." nhưng không có text

**Nguyên nhân**:
- Deepgram API key không hợp lệ
- Microphone không hoạt động
- Network issue

**Giải pháp**:
1. Kiểm tra DEEPGRAM_API_KEY trong `.env`
2. Test microphone tại: https://www.onlinemictest.com/
3. Kiểm tra browser console (F12) xem có errors
4. Restart backend

### Vấn Đề 2: Audio Không Phát

**Triệu chứng**: Text hiển thị nhưng không có tiếng

**Nguyên nhân**:
- Edge TTS service down
- Browser autoplay policy
- Speakers/headphones không hoạt động

**Giải pháp**:
1. Kiểm tra speakers/headphones
2. Click vào page để unlock audio (browser policy)
3. Kiểm tra backend logs xem có lỗi TTS
4. Thử refresh page

### Vấn Đề 3: Connection Timeout (1006, 1011)

**Triệu chứng**: "Kết nối Deepgram bị đóng"

**Nguyên nhân**:
- Deepgram timeout (user dừng nói quá lâu)
- Network unstable

**Giải pháp**:
- Đây là normal behavior khi dừng nói >10s
- Hệ thống tự động reconnect
- Không ảnh hưởng đến UX

### Vấn Đề 4: TTS Retry Delay

**Triệu chứng**: Delay 1-2 giây trước khi phát audio

**Nguyên nhân**:
- Edge TTS service retry
- Network latency

**Giải pháp**:
- Đã optimize retry delay xuống 1-2s
- Có loading spinner để UX tốt hơn
- Không thể tránh hoàn toàn

### Vấn Đề 5: Microphone Permission Denied

**Triệu chứng**: "Trình duyệt chưa được cấp quyền truy cập microphone"

**Giải pháp**:
1. Chrome: Settings → Privacy → Site Settings → Microphone → Allow
2. Firefox: Preferences → Privacy → Permissions → Microphone → Allow
3. Edge: Settings → Cookies and site permissions → Microphone → Allow
4. Refresh page sau khi cấp quyền

---

## 📊 Architecture Overview

### Backend Components

```
apps/backend/
├── app/
│   ├── api/
│   │   ├── voice_interview.py      # Main voice interview API
│   │   └── ws_stt.py                # WebSocket STT endpoint
│   └── modules/
│       └── interview/
│           ├── edge_tts_service.py  # Text-to-Speech
│           ├── faster_stt_service.py # Whisper STT fallback
│           └── ai_pipeline_service.py # AI question generation
```

### Frontend Components

```
apps/frontend/src/
├── pages/
│   ├── VoiceInterviewPage.tsx      # Main interview page
│   ├── DeviceTestPage.tsx          # Mic/speaker test
│   └── InterviewSelectionPage.tsx  # Job selection
└── components/
    └── voice-interview/
        ├── RulesModal.tsx           # Interview rules
        └── InterviewRulesMonitor.tsx # Tab-switch detection
```

### Data Flow

```
User speaks → Microphone → Browser MediaRecorder
    ↓
WebSocket (100ms chunks) → Backend → Deepgram API
    ↓
Transcript (interim/final) → Frontend → Live Transcript UI
    ↓
User clicks Stop → Submit answer → Backend
    ↓
AI analyzes → Generate next question → TTS → Audio
    ↓
Frontend plays audio + shows text → Repeat
```

---

## 🔧 Advanced Configuration

### Tăng Deepgram Timeout

Nếu muốn tránh timeout khi user dừng nói lâu:

```python
# apps/backend/app/api/ws_stt.py
dg_url = (
    f"wss://api.deepgram.com/v1/listen"
    f"?model=nova-2"
    f"&language={lang}"
    f"&smart_format=true"
    f"&interim_results=true"
    f"&endpointing=600"  # Tăng từ 300 lên 600 (10 phút)
    f"&vad_events=true"
)
```

### Thay Đổi TTS Voice

```python
# apps/backend/app/modules/interview/edge_tts_service.py
VIETNAMESE_VOICES = {
    'female': 'vi-VN-HoaiMyNeural',  # Giọng nữ mặc định
    'male': 'vi-VN-NamMinhNeural',   # Giọng nam mặc định
}
```

Danh sách voices: https://speech.microsoft.com/portal/voicegallery

### Giảm Latency

```env
# .env
WHISPER_MODEL_SIZE=tiny  # Thay vì base (nhanh hơn nhưng kém chính xác)
```

---

## 📝 Notes

- **Deepgram Free Tier**: $200 credit, đủ cho ~200 giờ transcription
- **Edge TTS**: Miễn phí, không giới hạn
- **Gemini API**: Free tier có quota limit, nên dùng nhiều keys
- **Browser Support**: Chrome, Edge, Firefox (latest versions)
- **Mobile**: Chưa optimize cho mobile, khuyến nghị dùng desktop

---

## 🆘 Support

Nếu gặp vấn đề không giải quyết được:

1. **Check logs**:
   - Backend: Terminal output
   - Frontend: Browser Console (F12)

2. **Debug files**:
   - `dg-test.html`: Test Deepgram STT
   - `.md/VOICE_INTERVIEW_TRANSCRIPT_DEBUG.md`: Debug guide

3. **Contact team**: Tạo issue trên GitHub hoặc liên hệ team lead

---

## ✅ Checklist Trước Khi Demo

- [ ] PostgreSQL đang chạy
- [ ] Neo4j đang chạy
- [ ] Backend đang chạy (port 8000)
- [ ] Frontend đang chạy (port 3000)
- [ ] DEEPGRAM_API_KEY đã cấu hình
- [ ] GEMINI_INTERVIEW_API_KEY đã cấu hình
- [ ] Microphone hoạt động
- [ ] Speakers hoạt động
- [ ] Test `dg-test.html` thành công
- [ ] Test voice interview flow thành công

---

**Last Updated**: 2026-05-11
**Version**: 1.0.0
