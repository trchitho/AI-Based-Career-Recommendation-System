# 🎵 Hướng Dẫn Upload Nhạc Lên Cloudflare - Nhanh Gọn

## ✅ Đã Hoàn Thành

1. ✅ File nhạc đã được copy vào: `apps/frontend/public/audio/success-sound.mp3`
2. ✅ Code đã sẵn sàng - chỉ cần upload lên Cloudflare
3. ✅ Tính năng hoạt động:
   - Hover vào button → phát âm thanh
   - Submit bài test → phát nhạc loop
   - Chuyển trang → tự động dừng

## 🚀 Cách Upload Lên Cloudflare (3 Phút)

### Bước 1: Đăng Nhập Cloudflare

1. Vào: https://dash.cloudflare.com/
2. Đăng nhập tài khoản

### Bước 2: Vào R2 Storage

1. Sidebar bên trái → Click **"R2"**
2. Nếu chưa có bucket → Click **"Create bucket"**
   - Tên bucket: `career-assets` (hoặc tên bạn thích)
   - Location: Automatic
   - Click **"Create bucket"**

### Bước 3: Upload File

1. Click vào bucket vừa tạo
2. Click nút **"Upload"**
3. Kéo thả file hoặc click chọn file:
   ```
   d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\apps\frontend\public\audio\success-sound.mp3
   ```
4. Đặt tên file: `audio/success-sound.mp3`
5. Click **"Upload"**

### Bước 4: Lấy Public URL

1. Click vào file vừa upload
2. Copy **"Public URL"** hoặc **"R2.dev URL"**
3. URL sẽ có dạng:
   ```
   https://pub-xxxxxxxxxxxxx.r2.dev/audio/success-sound.mp3
   ```

### Bước 5: Enable Public Access

1. Quay lại bucket settings
2. Tab **"Settings"**
3. Scroll xuống **"Public Access"**
4. Click **"Allow Access"**
5. Confirm

### Bước 6: Cập Nhật Code

Mở file: `apps/frontend/src/config/assets.ts`

**Tìm dòng này:**
```typescript
cloudflare: 'https://pub-xxxxx.r2.dev',
```

**Thay bằng URL thực của bạn:**
```typescript
cloudflare: 'https://pub-abc123def456.r2.dev',
```

**Tìm dòng này:**
```typescript
const CURRENT_BASE = isDevelopment ? 'local' : 'local';
```

**Đổi thành:**
```typescript
const CURRENT_BASE = isDevelopment ? 'local' : 'cloudflare';
```

### Bước 7: Test

```bash
# Local test
cd apps/frontend
npm run dev

# Production build
npm run build
```

## 🎯 Xong! Đơn Giản Vậy Thôi

Bây giờ:
- ✅ File nhạc đã ở trên Cloudflare CDN (nhanh, miễn phí)
- ✅ Code tự động dùng Cloudflare URL khi production
- ✅ Local vẫn dùng file trong public folder

## 📝 Lưu Ý

### Nếu Gặp Lỗi CORS

Vào R2 Bucket → Settings → CORS Policy → Add:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Nếu Muốn Dùng Custom Domain

1. Vào R2 Bucket → Settings
2. Tab "Custom Domains"
3. Click "Connect Domain"
4. Nhập domain: `cdn.yourdomain.com`
5. Follow hướng dẫn setup DNS

Sau đó update config:
```typescript
cloudflare: 'https://cdn.yourdomain.com',
```

## 🔥 Tính Năng Đã Có

### 1. Hover Sound
- Hover vào button → phát âm thanh ngắn
- Volume: 30%
- Không loop

### 2. Submit Sound
- Submit bài test → phát nhạc liên tục
- Volume: 50%
- Loop cho đến khi chuyển trang

### 3. Auto Stop
- Tự động dừng khi:
  - Chuyển sang trang kết quả
  - Có lỗi
  - Đóng trang

## 📊 Chi Phí

**Cloudflare R2 - MIỄN PHÍ:**
- ✅ 10GB storage/tháng
- ✅ 10 triệu requests/tháng
- ✅ Không giới hạn băng thông (egress)
- ✅ CDN toàn cầu

File nhạc ~100KB → Có thể serve cho hàng triệu users!

## 🆘 Cần Giúp?

### Option 1: Dùng Local (Không cần upload)

Nếu không muốn upload lên Cloudflare, code vẫn hoạt động với file local:

File `apps/frontend/src/config/assets.ts` - Giữ nguyên:
```typescript
const CURRENT_BASE = isDevelopment ? 'local' : 'local';
```

Khi deploy, đảm bảo folder `public/audio/` được deploy cùng.

### Option 2: Dùng Cloudflare Pages

Nếu deploy frontend lên Cloudflare Pages:
- File trong `public/` tự động có URL
- Không cần upload riêng lên R2
- URL: `https://your-site.pages.dev/audio/success-sound.mp3`

Update config:
```typescript
const CURRENT_BASE = isDevelopment ? 'local' : 'pages';
```

## ✨ Tóm Tắt

1. **Upload file lên Cloudflare R2** (3 phút)
2. **Copy Public URL**
3. **Update `apps/frontend/src/config/assets.ts`** (2 dòng)
4. **Deploy** → Xong!

---

**Trạng thái**: ✅ Code sẵn sàng, chỉ cần upload!
