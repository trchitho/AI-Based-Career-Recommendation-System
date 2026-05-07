
# 📄 Feature 3 - Voice Interview System (Fix & Optimization - Production Version)

---

## 1. Tổng quan vấn đề

Hệ thống Voice Interview hiện tại đã có flow cơ bản nhưng tồn tại nhiều vấn đề nghiêm trọng:

### ❌ Các lỗi chính

* UI recording sai state
* TTS lỗi 403 → AI không nói được
* Không sync text ↔ voice
* Voice selection không hoạt động
* UI chưa giống hệ thống thực tế (Braintrust)
* Không lưu full conversation
* Logic evaluation sai với voice mode
* Performance rất kém (delay cao)
* UX thiếu loading feedback

---

## 2. Device Test Page – Fix UX Recording (Critical UI Flow)

### ❌ Vấn đề

Hiện tại:

* Sau khi stop recording vẫn hiển thị:

  * Bắt đầu ghi âm
  * Dừng ghi âm
* Không có state rõ ràng
  → UX rất tệ

---

### ✅ Giải pháp: State Machine

```ts
type RecordingState =
  | "idle"
  | "recording"
  | "recorded"
```

---

### 🎯 UI Logic chuẩn

| State     | UI hiển thị        |
| --------- | ------------------ |
| idle      | Bắt đầu ghi âm     |
| recording | Dừng ghi âm        |
| recorded  | Nghe lại + Ghi lại |

---

### 🧠 Implementation

```ts
switch(state) {
  case "idle":
    show(StartButton)
    break

  case "recording":
    show(StopButton)
    break

  case "recorded":
    show(ReplayButton)
    show(RetryButton)
    break
}
```

---

### 📌 Behavior chuẩn

* Stop recording:
  → state = recorded
  → hide start/stop
* Click "Ghi lại":
  → reset audio
  → state = idle

---

## 3. Fix TTS 403 – AI HR không nói được (BLOCKER)

### ❌ Vấn đề

Log:

```
403 - speech.platform.bing.com
TrustedClientToken invalid
```

---

### ❗ Nguyên nhân

Bạn đang:

* call trực tiếp WebSocket của Microsoft
* dùng endpoint internal

→ BỊ BLOCK / EXPIRE TOKEN

---

### ✅ Fix chuẩn production

#### ✔️ Dùng library chính thức

```bash
pip install edge-tts
```

---

### Python Service

```python
import edge_tts
import uuid

async def synthesize_text(text: str, voice: str):
    filename = f"/tmp/{uuid.uuid4()}.mp3"

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(filename)

    return filename
```

---

### ❗ Bắt buộc fallback

```python
try:
    audio = synthesize_text(text)
except Exception:
    return {
        "audio_url": None,
        "text_only": True
    }
```

---

## 4. Sync Text với Voice (Karaoke Effect – UX CORE)

### ❌ Vấn đề

* Text render 1 lần
* Audio phát riêng
  → không đồng bộ

---

### ✅ Giải pháp

---

### Cách 1: Time-based (đủ dùng)

```ts
const words = text.split(" ")
const interval = duration / words.length

let i = 0
setInterval(() => {
  i++
  setDisplayed(words.slice(0, i).join(" "))
}, interval)
```

---

### Cách 2: Word Timestamp (chuẩn production)

* TTS trả về timestamp từng từ
* highlight theo timeline

---

### 🎯 Kết quả

* Text chạy theo voice
* giống karaoke
* UX tăng mạnh

---

## 5. Voice Selection (Nam/Nữ) – Fix Flow

### ❌ Vấn đề

* UI có toggle
* nhưng không ảnh hưởng backend

---

### ✅ Fix

---

### Frontend

```ts
POST /api/interview/voice/start
{
  voice_type: "female" // or male
}
```

---

### Backend

```python
VOICE_MAP = {
  "female": "vi-VN-HoaiMyNeural",
  "male": "vi-VN-NamMinhNeural"
}
```

---

### DB

```sql
ALTER TABLE interview_sessions
ADD COLUMN voice_type VARCHAR DEFAULT 'female';
```

---

## 6. UI/UX cải tiến (Braintrust-level)

### ❌ Vấn đề

* Text nhỏ
* spacing kém
* avatar tĩnh
* thiếu cảm giác “AI đang nói”

---

### ✅ Cải tiến

---

### Typography

```css
font-size: 20px;
line-height: 1.8;
max-width: 700px;
letter-spacing: 0.3px;
```

---

### Avatar Animation

```css
@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8 }
  50% { transform: scale(1.15); opacity: 1 }
  100% { transform: scale(1); opacity: 0.8 }
}
```

---

### Mic Effect

* Glow + ripple
* scale theo audio level

---

### Layout chuẩn

* center screen
* bubble lớn
* spacing rộng

---

## 7. Lưu Full Conversation (CRITICAL DATA)

### ❌ Vấn đề

* chỉ lưu từng câu rời

---

### ✅ Fix

---

### DB Schema

```sql
interview_messages (
  id UUID,
  session_id UUID,
  role VARCHAR, -- ai/user
  content TEXT,
  audio_url TEXT,
  order_index INT,
  created_at TIMESTAMP
)
```

---

### 🎯 Flow

```
Q1 (audio)
→ A1 (audio)
→ Q2
→ A2
```

---

### 🎧 Kết quả

* replay full interview
* training AI
* analytics

---

## 8. Tab Switch – Debug Mode

### ❌ Vấn đề

* limit = 3 → khó debug

---

### ✅ Fix

```ts
MAX_TAB_SWITCH = 10
```

---

### API

```
POST /api/interview/voice/tab-switch
```

---

## 9. Evaluation Logic – Voice Mode (RẤT QUAN TRỌNG)

### ❌ Vấn đề

* Voice đang:
  → chấm điểm ngay
  → sai UX

---

### ✅ Fix

---

### Trong interview

```json
{
 "message": "Cảm ơn câu trả lời của bạn. Chúng ta tiếp tục câu tiếp theo."
}
```

---

### Sau khi kết thúc

```json
{
 "final_score": 8.3,
 "feedback": [
   { "q1": "...", "score": 8 },
   { "q2": "...", "score": 7 }
 ]
}
```

---

### 🎯 Logic

* Interview = flow tự nhiên
* Evaluation = tổng kết

---

## 10. Performance – Fix toàn diện (CRITICAL)

### ❌ Vấn đề

* delay lớn:

  * STT
  * Gemini
  * TTS

---

### ✅ Fix

---

### UI Loading State

| Stage | UI                      |
| ----- | ----------------------- |
| STT   | “Đang xử lý giọng nói…” |
| AI    | “AI đang suy nghĩ…”     |
| TTS   | “Đang tạo giọng nói…”   |

---

### Code

```ts
setState("processing_stt")
setState("processing_ai")
setState("processing_tts")
```

---

### Backend Optimization

* dùng Gemini Flash
* async TTS
* cache question

---

### Frontend Optimization

* preload audio
* stream text trước audio

---

### STT Optimization

* compress audio
* limit duration
* không gửi file lớn

---

## 11. Ẩn AI Chatbot trong Voice Mode

### ❌ Vấn đề

* đang hiển thị chatbot

---

### ✅ Fix

```ts
if (mode === "voice") {
  hide(ChatbotComponent)
}
```

---

## 12. Kết luận

### 🎯 Bạn đang chuyển từ:

👉 Chat Interview

→

👉 **AI Voice Interview Platform**

---

### 🚀 Impact

| Feature      | Impact             |
| ------------ | ------------------ |
| Fix TTS      | hệ thống hoạt động |
| Sync text    | UX tăng mạnh       |
| Voice flow   | giống thật         |
| Full storage | data + AI training |
| Performance  | production ready   |

---

# 🔥 FINAL