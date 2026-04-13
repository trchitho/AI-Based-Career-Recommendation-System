# 🔍 Test với Token thật

## Lấy token

1. **Mở Browser** → F12 → Console
2. **Chạy**:
```javascript
console.log(localStorage.getItem('accessToken'));
```
3. **Copy token** (dài, bắt đầu bằng `eyJ...`)

## Test API với token

Thay `YOUR_TOKEN_HERE` bằng token vừa copy:

```bash
# Test endpoint khác (để verify token OK)
curl -X GET "http://localhost:8000/api/assessments" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Nếu trả về data → Token OK

# Test skill-gap endpoint
curl -X GET "http://localhost:8000/api/skill-gap/my-analyses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Nếu 401 → Skill-gap routes có vấn đề với auth
# Nếu 200/empty array → Skill-gap routes OK
```

## Nếu skill-gap trả về 401 nhưng assessments OK

→ Vấn đề: Middleware auth không apply cho skill-gap routes

## Fix

Kiểm tra `main.py` xem skill-gap router có được include đúng không.

---

**Hoặc đơn giản hơn**: Test endpoint khác xem có 401 không?

Ví dụ vào `/dashboard` hoặc `/assessment` → Nếu OK → Token đúng, vấn đề là skill-gap routes.
