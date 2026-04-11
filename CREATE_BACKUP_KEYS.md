# 🔑 Tạo Backup API Keys - Giải Quyết Quota Issue

## 🚨 Vấn Đề Hiện Tại

```
❌ Cv_Analysis quota exceeded
⚡ FAST FAIL mode - immediate fallback
```

**Nguyên nhân**: Tất cả 3 streams đang dùng cùng API key → khi 1 stream hết quota thì tất cả đều hết.

## 🛠️ Giải Pháp Ngay Lập Tức

### 1. **Tạo 3 API Keys Mới (5 phút)**

#### Bước 1: Truy cập Google AI Studio
- URL: https://aistudio.google.com/
- Đăng nhập Gmail

#### Bước 2: Tạo 3 Projects Riêng Biệt
```
Project 1: "Career-AI-Chatbot-Backup"
Project 2: "Career-AI-Assessment-Backup"  
Project 3: "Career-AI-CV-Backup"
```

#### Bước 3: Tạo API Key cho mỗi project
- Mỗi project → Create API Key
- Copy 3 keys mới

### 2. **Cập Nhật .env File**

```env
# Primary Keys (hiện tại - đã hết quota)
GEMINI_CHATBOT_API_KEY=AIzaSyCf4IA7UHgBd-kwfH6gJXxOJENEyMRHwoE
GEMINI_ASSESSMENT_API_KEY=AIzaSyCf4IA7UHgBd-kwfH6gJXxOJENEyMRHwoE
GEMINI_CV_API_KEY=AIzaSyCf4IA7UHgBd-kwfH6gJXxOJENEyMRHwoE

# Backup Keys (MỚI - có quota)
GEMINI_CHATBOT_BACKUP_KEY=AIzaSyNewKey1...
GEMINI_ASSESSMENT_BACKUP_KEY=AIzaSyNewKey2...
GEMINI_CV_BACKUP_KEY=AIzaSyNewKey3...
```

### 3. **Restart Server**
```bash
python restart_server.py
```

## 🎯 Kết Quả Mong Đợi

### ✅ **Sau khi có backup keys:**
```
🔧 Trying to initialize cv_analysis with model: gemini-flash-latest
⚠️ Primary key quota exceeded, trying backup key...
✅ CV Analysis stream initialized with backup key: gemini-2.5-flash-native-audio-dialog
```

### ✅ **CV Analysis sẽ hoạt động:**
```
🤖 [CV Parser V2] STARTING AI EXTRACTION
Using Gemini model: gemini-2.5-flash-native-audio-dialog
✅ AI extraction successful - found 15 skills
```

## 🚀 Lợi Ích Backup System

### 1. **Quota Independence**
- Primary keys hết quota → Auto-switch to backup keys
- Backup keys có 20 requests/day riêng
- Total: 120 requests/day (6 keys x 20)

### 2. **Zero Downtime**
- Automatic failover
- User không bị ảnh hưởng
- Service continues seamlessly

### 3. **Model Diversity**
- Primary keys → gemini-flash-latest
- Backup keys → gemini-2.5-flash-native-audio-dialog, gemini-3-flash-live
- Always use best available model

## 📊 Monitoring

### Check Status:
```bash
GET /api/admin/gemini-status
```

### Expected Response:
```json
{
  "streams": {
    "chatbot": {
      "available": true,
      "model": "gemini-flash-latest",
      "api_key_prefix": "AIzaSyCf4IA7UHgBd-kw..."
    },
    "cv_analysis": {
      "available": true,
      "model": "gemini-2.5-flash-native-audio-dialog",
      "api_key_prefix": "AIzaSyNewKey3..."
    }
  }
}
```

## ⚡ Quick Fix (Ngay Bây Giờ)

### Nếu chưa tạo được keys mới:
1. **Đợi 24h**: Quota sẽ reset
2. **Dùng keyword matching**: Vẫn hoạt động tốt
3. **Tạo keys mới**: Khi có thời gian

### Nếu đã có keys mới:
1. **Update .env**: Thay backup keys
2. **Restart server**: `python restart_server.py`
3. **Test**: CV analysis sẽ hoạt động với AI

## 🎉 Kết Luận

**Backup API Keys System** sẽ giải quyết hoàn toàn quota issues:
- ✅ 6 API keys total (120 requests/day)
- ✅ Automatic failover
- ✅ Model diversity
- ✅ Zero downtime
- ✅ Future-proof

**Tạo 3 backup keys mới là giải pháp tốt nhất!** 🚀