# CHỨC NĂNG 3: TEST MICRO + RULES + VOICE INTERVIEW (PRODUCTION DESIGN)

---

## 1. Vấn đề hiện tại

Hệ thống AI Interview hiện tại:
- chỉ hỗ trợ text
- chưa có voice interaction thực tế

Thiếu:
- kiểm tra thiết bị (micro, speaker)
- voice pipeline hoàn chỉnh
- rule đảm bảo công bằng
- đồng bộ giữa text và voice của AI

Hệ quả:
- UX không giống phỏng vấn thật
- không kiểm soát được audio input
- không mở rộng được voice AI (tone, confidence, speaking style)

---

## 2. Giải pháp tổng thể

Xây dựng **Voice Interaction Layer** gồm 4 thành phần:

1. Device Test Page (pre-check)
2. Voice Interview Runtime
3. Rules System
4. Audio Processing Pipeline (STT + TTS)

---

# 2.1 DEVICE TEST PAGE (PRE-INTERVIEW)

## Mục tiêu

- cho user chọn thiết bị
- test micro + speaker
- record thử và nghe lại

---

## Vị trí trong hệ thống

```
apps/web/app/interview/device-test/page.tsx
```

---

## UI thiết kế

```
[ Select Microphone ▼ ]
[ Select Speaker ▼ ]

[ Start Recording ]
[ Stop Recording ]
[ Play Recording ]
[ Record Again ]
```

---

## Lấy danh sách thiết bị

```ts
const devices = await navigator.mediaDevices.enumerateDevices()

const microphones = devices.filter(d => d.kind === "audioinput")
const speakers = devices.filter(d => d.kind === "audiooutput")
```

---

## Chọn Microphone

```ts
navigator.mediaDevices.getUserMedia({
  audio: {
    deviceId: selectedMicId
  }
})
```

---

## Record audio

```ts
const mediaRecorder = new MediaRecorder(stream)

mediaRecorder.ondataavailable = (e) => {
  audioChunks.push(e.data)
}
```

---

## Play lại + chọn speaker

```ts
const audioBlob = new Blob(audioChunks)
const audioUrl = URL.createObjectURL(audioBlob)

audio.src = audioUrl
await audio.setSinkId(selectedSpeakerId)
```

---

## Record lại (quan trọng)

```ts
function resetRecording() {
  audioChunks = []
}
```

---

## Validation

- nếu không record được → disable Start Interview
- nếu không có mic → block

---

# 2.2 VOICE INTERVIEW FLOW (RUNTIME)

---

## Flow tổng thể

```
AI generate question (text)
   ↓
TTS (voice)
   ↓
Render text chạy theo giọng (sync)
   ↓
User record
   ↓
Click "Stop Speaking"
   ↓
Upload audio
   ↓
STT → text
   ↓
AI evaluate (pipeline)
   ↓
Next question
```

---

## Đồng bộ TEXT + VOICE (QUAN TRỌNG)

### Yêu cầu
- text hiển thị phải **khớp 100% với audio**

---

## Cách làm chuẩn

### Backend trả về

```json
{
  "question_text": "Bạn xử lý API như thế nào?",
  "audio_url": "..."
}
```

---

### Frontend

- play audio
- dùng typing animation theo timestamp

---

### Option chuẩn hơn (nâng cao)

- TTS trả về **word timestamps**
- text highlight theo từng từ

---

# 2.3 AI VOICE (TTS) - LỰA CHỌN MODEL

## Yêu cầu

- tiếng Việt chuẩn
- giọng rõ, tròn chữ
- có nam/nữ
- ưu tiên free

---

## Option đề xuất

### 1. Google TTS (FREE tier tốt)

- giọng: vi-VN
- có male/female
- ổn định

---

### 2. Edge TTS (FREE - RẤT TỐT)

- giọng tự nhiên
- hỗ trợ vi-VN
- miễn phí

→ KHUYÊN DÙNG

---

## Ví dụ Edge TTS

```ts
import edgeTTS from "edge-tts"

const voice = "vi-VN-HoaiMyNeural" // nữ
const voiceMale = "vi-VN-NamMinhNeural"
```

---

## Cho user chọn voice

```
[ Voice: Female | Male ]
```

---

# 2.4 AUDIO INPUT FLOW

---

## Record

```ts
mediaRecorder.start()
```

---

## Stop

```ts
mediaRecorder.stop()
```

Trigger:
```
User click "Stop Speaking"
```

---

## Upload

```ts
const formData = new FormData()
formData.append("file", audioBlob)
```

---

# 2.5 BACKEND AUDIO PROCESSING

---

## API

```
POST /interview/audio
```

---

## Flow

```
Receive audio
   ↓
Upload storage (S3/local)
   ↓
STT → text
   ↓
Call interview_pipeline
   ↓
Return result
```

---

# 2.6 STT (Speech to Text)

---

## Option

- Whisper (open-source)
- Google STT

---

## Output

```json
{
  "text": "Câu trả lời của user"
}
```

---

# 2.7 RULES SYSTEM

---

## Rule 1: Tab switch

```ts
let count = 0

document.addEventListener("visibilitychange", () => {
  if (document.hidden) count++
})
```

```
count >= 3 → terminate interview
```

---

## Rule 2: UI rules

```
- Click "Stop Speaking" khi trả lời xong
- Không chuyển tab quá 3 lần
- Audio sẽ được ghi lại
```

---

## Rule 3: Backend validation (optional)

- lưu tab_switch_count
- nếu vượt → reject

---

# 2.8 DATABASE

```sql
CREATE TABLE interview_audio (
  id UUID PRIMARY KEY,
  session_id UUID,
  file_url TEXT,
  created_at TIMESTAMP
);
```

---

# 3. ÁP DỤNG HỆ THỐNG

---

## Flow đầy đủ

```
Device Test Page
   ↓
Chọn mic + speaker
   ↓
Record + nghe lại
   ↓
Start Interview

Voice Interview Loop
   ↓
AI hỏi (text + voice)
   ↓
User record
   ↓
Stop Speaking
   ↓
Upload audio
   ↓
STT
   ↓
AI evaluate
   ↓
Next question
```

---

## Mapping kiến trúc

| Layer | Responsibility |
|------|--------------|
| Frontend | UI + record + rules |
| BFF | routing |
| interview-service | audio + pipeline |
| ai-core | STT + TTS + logic |
| Storage | audio |

---

# 4. KẾT QUẢ

---

## UX

- giống hệ thống phỏng vấn thật
- có kiểm tra thiết bị

---

## System

- lưu audio → training sau
- mở rộng:
  - voice emotion
  - speaking analysis

---

## AI

- từ text → voice interaction system

---

# TỔNG KẾT

Bạn đang nâng cấp từ:

```
Chatbot interview
```

→ thành:

```
Voice-based AI Interview Platform
```

---

## Impact

| Feature | Impact |
|--------|------|
| JD input | realism |
| Level system | personalization |
| Voice + rules | production-ready |

---

## Kết luận

Voice layer là thành phần bắt buộc nếu muốn hệ thống giống tuyển dụng thật.

Nếu thiếu → demo
Nếu có → production system

