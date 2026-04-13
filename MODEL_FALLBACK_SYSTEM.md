# 🔄 Model Fallback System - Auto-Switch Models

## 🎯 Tính Năng Mới

Hệ thống giờ đây tự động **chuyển đổi model** khi model hiện tại hết hạn, deprecated, hoặc không khả dụng.

## 🚀 Fallback Models Priority

### 📋 Thứ Tự Ưu Tiên (Auto-Switch):
1. **Primary Model** (từ .env): `gemini-flash-latest`
2. **Gemini 2.5 Flash Native Audio Dialog** ⭐ NEW
3. **Gemini 3 Flash Live** ⭐ NEW  
4. **Gemini 2.5 Flash** (stable)
5. **Gemini Flash Latest** (always latest)
6. **Gemini 2.0 Flash** (older stable)

## 🔧 Cách Hoạt Động

### ✅ **Auto-Detection & Switch:**
```
🔧 Trying to initialize chatbot with model: gemini-flash-latest
❌ Model gemini-flash-latest failed: Model not found
🔄 Trying fallback model: gemini-2.5-flash-native-audio-dialog
✅ Successfully switched to: gemini-2.5-flash-native-audio-dialog
```

### ✅ **Smart Error Handling:**
- **Model deprecated/unavailable**: Auto-switch to next model
- **Quota exceeded**: Fast fail (không switch model)
- **API key invalid**: Stop trying (không switch model)
- **Network timeout**: Retry với cùng model

## 📊 Monitoring & Management

### 🔍 **Check Model Status:**
```bash
GET /api/admin/gemini-status
```

**Response:**
```json
{
  "success": true,
  "streams": {
    "chatbot": {
      "available": true,
      "model": "gemini-2.5-flash-native-audio-dialog",
      "api_key_prefix": "AIzaSyDhqIYTWjjVEKul..."
    },
    "assessment": {
      "available": true,
      "model": "gemini-3-flash-live",
      "api_key_prefix": "AIzaSyDVL1fmeTBFyYma..."
    },
    "cv_analysis": {
      "available": true,
      "model": "gemini-flash-latest",
      "api_key_prefix": "AIzaSyCrAvCAlKUpMtFJ..."
    }
  },
  "summary": {
    "total_streams": 3,
    "active_streams": 3,
    "models_in_use": [
      "gemini-2.5-flash-native-audio-dialog",
      "gemini-3-flash-live", 
      "gemini-flash-latest"
    ]
  }
}
```

### 🔄 **Force Reinitialize:**
```bash
POST /api/admin/gemini-reinit
```

**Use Case:** Khi Google release model mới, force reinit để switch sang model tốt hơn.

## ⚙️ Configuration

### 📝 **Environment Variables:**
```env
# Enable fallback system
GEMINI_ENABLE_FALLBACK=true

# Primary models (sẽ fallback nếu fail)
GEMINI_CHATBOT_MODEL=gemini-flash-latest
GEMINI_ASSESSMENT_MODEL=gemini-flash-latest  
GEMINI_CV_MODEL=gemini-flash-latest
```

### 🎯 **Fallback Priority (Hard-coded):**
```python
fallback_models = [
    self.model_name,  # Primary từ .env
    "gemini-2.5-flash-native-audio-dialog",  # NEW Model 1
    "gemini-3-flash-live",  # NEW Model 2
    "gemini-2.5-flash",  # Stable
    "gemini-flash-latest",  # Always latest
    "gemini-2.0-flash",  # Older stable
]
```

## 🎉 Lợi Ích

### ✅ **Zero Downtime:**
- Model deprecated → Auto-switch → Service continues
- Không cần manual intervention
- User không bị ảnh hưởng

### ✅ **Always Latest Models:**
- Tự động sử dụng model mới nhất khả dụng
- Gemini 2.5 Flash Native Audio Dialog
- Gemini 3 Flash Live
- Performance improvements tự động

### ✅ **Smart Fallback:**
- Chỉ switch khi model thực sự unavailable
- Không switch khi quota exceeded (đúng behavior)
- Preserve API key quota cho từng stream

### ✅ **Easy Monitoring:**
- Real-time model status
- API endpoints để check
- Force reinit khi cần

## 🔍 Troubleshooting

### ❓ **Model Switch Logs:**
```
🔧 Trying to initialize cv_analysis with model: gemini-flash-latest
⚠️ Model gemini-flash-latest failed: 404 Model not found
🔄 Model gemini-flash-latest seems unavailable, trying fallback...
🔄 Trying fallback model: gemini-2.5-flash-native-audio-dialog
✅ Successfully switched to: gemini-2.5-flash-native-audio-dialog
```

### ❓ **Quota vs Model Issues:**
```
# Quota exceeded - NO model switch (correct)
❌ Cv_Analysis quota exceeded
⚡ FAST FAIL mode - immediate fallback

# Model unavailable - AUTO switch (correct)  
❌ Model not found: gemini-flash-latest
🔄 Trying fallback model: gemini-2.5-flash-native-audio-dialog
```

## 🎯 Kết Luận

**✅ SYSTEM FUTURE-PROOF:**

1. **Auto-adapt to new models**: Gemini 2.5/3.0 Flash models
2. **Zero manual intervention**: Tự động switch khi cần
3. **Maintain service quality**: Luôn dùng model tốt nhất available
4. **Smart error handling**: Phân biệt quota vs model issues
5. **Easy monitoring**: Admin endpoints để track

**Hệ thống giờ đây sẽ tự động adapt khi Google release model mới hoặc deprecate model cũ!** 🚀