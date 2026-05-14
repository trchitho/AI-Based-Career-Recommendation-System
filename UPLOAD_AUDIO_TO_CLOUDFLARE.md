# Hướng Dẫn Upload File Nhạc Lên Cloudflare R2

## Bước 1: Chuẩn Bị

File nhạc đã được copy vào:
- **Local**: `apps/frontend/public/audio/success-sound.mp3`
- **Source**: `db/backup/6c943ee6e4da42c69c47f5a984da5dd7.mp3`

## Bước 2: Upload Lên Cloudflare R2

### Cách 1: Sử dụng Cloudflare Dashboard (Dễ nhất)

1. **Đăng nhập Cloudflare Dashboard**:
   - Truy cập: https://dash.cloudflare.com/
   - Đăng nhập tài khoản của bạn

2. **Vào R2 Storage**:
   - Sidebar bên trái → Click "R2"
   - Chọn bucket bạn muốn upload (hoặc tạo bucket mới)

3. **Upload File**:
   - Click "Upload" button
   - Chọn file: `d:\test_capston\Capstone\AI-Based-Career-Recommendation-System\apps\frontend\public\audio\success-sound.mp3`
   - Hoặc kéo thả file vào

4. **Đặt Tên File**:
   - Đặt tên: `audio/success-sound.mp3`
   - Hoặc: `assets/sounds/success-sound.mp3`

5. **Lấy Public URL**:
   - Sau khi upload, click vào file
   - Copy "Public URL" hoặc "R2.dev URL"
   - Ví dụ: `https://pub-xxxxx.r2.dev/audio/success-sound.mp3`

### Cách 2: Sử dụng Wrangler CLI (Nâng cao)

```bash
# Cài đặt Wrangler (nếu chưa có)
npm install -g wrangler

# Đăng nhập Cloudflare
wrangler login

# Upload file
wrangler r2 object put <BUCKET_NAME>/audio/success-sound.mp3 --file="apps/frontend/public/audio/success-sound.mp3"

# Lấy public URL
wrangler r2 object get <BUCKET_NAME>/audio/success-sound.mp3 --url
```

### Cách 3: Sử dụng API (Tự động)

```bash
# Sử dụng curl với API token
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/buckets/{bucket_name}/objects/audio/success-sound.mp3" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: audio/mpeg" \
  --data-binary "@apps/frontend/public/audio/success-sound.mp3"
```

## Bước 3: Cấu Hình Public Access (Quan Trọng!)

Để file có thể truy cập công khai:

1. **Vào R2 Bucket Settings**:
   - Chọn bucket của bạn
   - Tab "Settings"

2. **Enable Public Access**:
   - Scroll xuống "Public Access"
   - Click "Allow Access"
   - Hoặc connect custom domain

3. **Lấy Public URL**:
   - Format: `https://pub-{bucket-id}.r2.dev/audio/success-sound.mp3`
   - Hoặc custom domain: `https://cdn.yourdomain.com/audio/success-sound.mp3`

## Bước 4: Cập Nhật Code

Sau khi có URL từ Cloudflare, cập nhật file:

### File: `apps/frontend/src/pages/AssessmentPage.tsx`

```typescript
// Thay đổi từ:
const hoverSound = useSound('/audio/success-sound.mp3', { volume: 0.3, loop: false });
const submitSound = useSound('/audio/success-sound.mp3', { volume: 0.5, loop: true });

// Thành:
const hoverSound = useSound('https://pub-xxxxx.r2.dev/audio/success-sound.mp3', { volume: 0.3, loop: false });
const submitSound = useSound('https://pub-xxxxx.r2.dev/audio/success-sound.mp3', { volume: 0.5, loop: true });
```

### Hoặc Tạo Config File (Khuyến nghị)

**File: `apps/frontend/src/config/assets.ts`**

```typescript
export const ASSETS = {
  sounds: {
    success: 'https://pub-xxxxx.r2.dev/audio/success-sound.mp3',
    hover: 'https://pub-xxxxx.r2.dev/audio/success-sound.mp3',
  },
  images: {
    // Thêm các assets khác
  }
};
```

**Sử dụng trong AssessmentPage.tsx:**

```typescript
import { ASSETS } from '../config/assets';

const hoverSound = useSound(ASSETS.sounds.hover, { volume: 0.3, loop: false });
const submitSound = useSound(ASSETS.sounds.success, { volume: 0.5, loop: true });
```

## Bước 5: Test

1. **Test Local** (trước khi deploy):
   ```bash
   cd apps/frontend
   npm run dev
   ```
   - Mở http://localhost:5173
   - Hover vào button → nghe âm thanh
   - Submit bài test → nghe nhạc loop

2. **Test Production**:
   - Deploy frontend
   - Test trên production URL

## Lợi Ích Của Cloudflare R2

✅ **Tốc độ nhanh**: CDN toàn cầu
✅ **Miễn phí**: 10GB storage + 10 triệu requests/tháng
✅ **Không giới hạn băng thông**: Không tính phí egress
✅ **Độ tin cậy cao**: 99.9% uptime
✅ **Dễ quản lý**: Dashboard trực quan

## Troubleshooting

### Lỗi: CORS Error

Nếu gặp lỗi CORS khi load audio từ Cloudflare:

1. Vào R2 Bucket Settings
2. Tab "CORS Policy"
3. Thêm rule:

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

### Lỗi: 403 Forbidden

- Kiểm tra Public Access đã được enable
- Kiểm tra URL có đúng không
- Kiểm tra file đã upload thành công

### Lỗi: Audio không phát

- Kiểm tra browser console
- Kiểm tra file format (MP3 được hỗ trợ rộng rãi)
- Kiểm tra volume setting
- Test với file audio khác

## Alternative: Sử dụng Cloudflare Pages

Nếu bạn đang deploy frontend lên Cloudflare Pages, có thể đặt file trong `public/` folder:

```
apps/frontend/public/audio/success-sound.mp3
```

Sau khi deploy, file sẽ tự động có URL:
```
https://your-site.pages.dev/audio/success-sound.mp3
```

## Tóm Tắt

1. ✅ File đã được copy vào `apps/frontend/public/audio/success-sound.mp3`
2. ⏳ Upload lên Cloudflare R2 (làm thủ công qua Dashboard)
3. ⏳ Lấy Public URL
4. ⏳ Cập nhật code với URL mới
5. ✅ Code đã sẵn sàng sử dụng

**Lưu ý**: Hiện tại code đang dùng local path `/audio/success-sound.mp3`. Sau khi upload lên Cloudflare và có URL, thay thế path này bằng Cloudflare URL.
