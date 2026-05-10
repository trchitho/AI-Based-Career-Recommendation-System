# 🔧 Hướng Dẫn Debug Live Transcript Không Hiển Thị

## ✅ Đã Sửa

### Backend (`ws_stt.py`)
1. **Thêm logging chi tiết**:
   - Log API key (masked) khi khởi tạo
   - Log số lượng audio chunks đã gửi
   - Log mỗi transcript message từ Deepgram
   - Log errors với stack trace đầy đủ

2. **Cải thiện error handling**:
   - Catch và log tất cả exceptions
   - Gửi error messages về frontend

### Frontend (`VoiceInterviewPage.tsx`)
1. **Thêm console logging**:
   - Log tất cả WebSocket messages
   - Log audio format đang sử dụng
   - Log số lượng chunks đã gửi
   - Log transcript updates (final và interim)

2. **Cải thiện UI**:
   - Thêm badge "Đang ghi" khi recording
   - Hiển thị error messages rõ ràng
   - Log WebSocket close events

## 🔍 Cách Debug

### 1. Kiểm Tra Backend Logs
Mở terminal backend và xem logs khi recording:

```bash
cd apps/backend
# Logs sẽ hiển thị:
# [DG-WS] Starting Deepgram SDK streaming session (lang=vi, api_key=********1e)
# [DG-WS] Sent 10 chunks (12345 bytes total)
# [DG-WS] Received message #1: type=Results
# [DG-WS] Transcript: 'xin chào...' (is_final=False, speech_final=False)
```

**Nếu không thấy logs "Sent X chunks"**:
- Microphone không hoạt động
- Browser không gửi audio

**Nếu không thấy logs "Received message"**:
- Deepgram API key không hợp lệ
- Deepgram timeout
- Audio format không được hỗ trợ

### 2. Kiểm Tra Browser Console
Mở DevTools (F12) → Console tab:

```javascript
// Logs sẽ hiển thị:
[DG-WS] Using audio format: audio/webm;codecs=opus
[DG-WS] Deepgram ready ✓
[DG-WS] Sent 10 chunks (12345 bytes total)
[DG-WS] Received message: transcript {...}
[DG-WS] Updated INTERIM transcript: xin chào...
```

**Nếu không thấy "Deepgram ready"**:
- WebSocket connection failed
- Backend không chạy hoặc không accessible

**Nếu thấy "Sent X chunks" nhưng không có "Received message"**:
- Deepgram không phản hồi (timeout)
- API key không hợp lệ
- Audio format không được Deepgram hỗ trợ

### 3. Kiểm Tra Network Tab
DevTools → Network → WS (WebSocket):

1. Tìm connection `ws://localhost:8000/ws/deepgram-stt`
2. Click vào connection
3. Xem Messages tab:
   - **Outgoing**: Audio chunks (binary data)
   - **Incoming**: `{"type":"ready"}`, `{"type":"transcript",...}`

**Nếu không thấy incoming messages**:
- Deepgram không phản hồi
- Backend có lỗi

### 4. Kiểm Tra Microphone
1. Mở Settings → Privacy → Microphone
2. Đảm bảo browser có quyền truy cập microphone
3. Test microphone bằng cách:
   - Mở https://www.onlinemictest.com/
   - Nói thử và xem waveform có hiển thị không

### 5. Kiểm Tra DEEPGRAM_API_KEY
```bash
# Mở file .env
cd apps/backend
notepad .env

# Tìm dòng:
DEEPGRAM_API_KEY=65557b38a88764dcda1a38090290a95ef31d301e

# Kiểm tra key có hợp lệ không:
# - Không có khoảng trắng
# - Không bị comment (#)
# - Key còn quota (chưa hết free tier)
```

**Test Deepgram API key**:
```bash
curl -X POST "https://api.deepgram.com/v1/listen" \
  -H "Authorization: Token 65557b38a88764dcda1a38090290a95ef31d301e" \
  -H "Content-Type: audio/wav" \
  --data-binary @test.wav
```

## 🐛 Các Lỗi Thường Gặp

### Lỗi 1: "Đang nghe..." nhưng không có text
**Nguyên nhân**: Deepgram timeout hoặc không nhận được audio

**Giải pháp**:
1. Kiểm tra backend logs xem có "Sent X chunks" không
2. Nếu có → Deepgram timeout → Đợi 5-10s hoặc restart backend
3. Nếu không → Microphone không hoạt động → Kiểm tra quyền truy cập

### Lỗi 2: WebSocket connection failed
**Nguyên nhân**: Backend không chạy hoặc CORS issue

**Giải pháp**:
```bash
# Restart backend
cd apps/backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Lỗi 3: "DEEPGRAM_API_KEY not set"
**Nguyên nhân**: .env file không được load

**Giải pháp**:
```bash
# Kiểm tra .env file tồn tại
cd apps/backend
dir .env

# Restart backend để reload .env
```

### Lỗi 4: Deepgram trả về empty transcript
**Nguyên nhân**: Audio quality thấp hoặc không có tiếng nói

**Giải pháp**:
1. Nói to và rõ ràng hơn
2. Kiểm tra microphone quality
3. Giảm background noise

### Lỗi 5: Transcript bị delay
**Nguyên nhân**: Network latency hoặc Deepgram processing time

**Giải pháp**:
- Đây là bình thường, interim results có thể delay 200-500ms
- Final results có thể delay 1-2s
- Nếu delay > 5s → Kiểm tra network connection

## 📊 Expected Behavior

### Normal Flow:
1. User clicks "Bắt đầu trả lời"
2. Browser requests microphone permission
3. Frontend connects to WebSocket `/ws/deepgram-stt`
4. Backend connects to Deepgram WebSocket
5. Backend sends `{"type":"ready"}` to frontend
6. Frontend starts sending audio chunks (100ms intervals)
7. Backend forwards chunks to Deepgram
8. Deepgram sends interim results every 200-500ms
9. Frontend displays interim text (gray, italic)
10. Deepgram sends final results when user pauses
11. Frontend displays final text (white, normal)

### Timing:
- **First interim result**: 500ms - 2s after speaking
- **Interim updates**: Every 200-500ms
- **Final result**: 1-2s after user stops speaking

## 🔄 Fallback Mechanism

Nếu Deepgram WebSocket fail, hệ thống tự động chuyển sang HTTP polling:
1. Ghi audio 1.5s
2. Convert sang WAV 16kHz
3. Gửi lên `/api/interview/voice/stt-live`
4. Backend gọi Deepgram HTTP API
5. Trả về transcript
6. Lặp lại

**Nhược điểm của HTTP fallback**:
- Latency cao hơn (~1.8s mỗi cycle)
- Không có interim results
- Tốn bandwidth hơn

## 📞 Support

Nếu vẫn không hoạt động sau khi thử tất cả các bước trên:

1. **Collect logs**:
   - Backend logs (terminal output)
   - Browser console logs (F12 → Console)
   - Network logs (F12 → Network → WS)

2. **Check environment**:
   - OS: Windows/Mac/Linux?
   - Browser: Chrome/Firefox/Edge?
   - Microphone: Built-in/External?

3. **Test với audio file**:
   - Thay vì microphone, test với audio file
   - Xem Deepgram có nhận dạng được không

## ✅ Success Indicators

Hệ thống hoạt động tốt khi:
- ✅ Backend logs: "Deepgram ready ✓"
- ✅ Browser console: "Deepgram ready ✓"
- ✅ Browser console: "Sent X chunks"
- ✅ Browser console: "Received message: transcript"
- ✅ UI: Badge "Đang ghi" hiển thị
- ✅ UI: Interim text (gray) xuất hiện trong 1-2s
- ✅ UI: Final text (white) xuất hiện khi dừng nói
