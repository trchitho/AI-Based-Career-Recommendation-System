# 🚀 Vercel Deployment Guide

## 📋 Tổng quan

Hướng dẫn deploy ứng dụng Career AI lên Vercel.

## 🎯 Cấu trúc Deployment

```
Frontend: Vercel (React + Vite)
Backend: Railway/Render/DigitalOcean (FastAPI)
Database: Supabase/Railway (PostgreSQL)
```

## 📦 Chuẩn bị

### 1. Frontend (Vercel)
- ✅ React + Vite
- ✅ Static site generation
- ✅ Automatic deployments from Git

### 2. Backend (Railway/Render)
- ✅ FastAPI
- ✅ PostgreSQL database
- ✅ Environment variables

## 🚀 Deploy Frontend lên Vercel

### Bước 1: Chuẩn bị Repository

```bash
# Đảm bảo code đã commit
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Bước 2: Import Project vào Vercel

1. Truy cập: https://vercel.com
2. Click "Add New" → "Project"
3. Import Git Repository
4. Chọn repository của bạn

### Bước 3: Cấu hình Project

**Root Directory**: `apps/frontend`

**Framework Preset**: Vite

**Build Command**: `npm run build`

**Output Directory**: `dist`

**Install Command**: `npm install`

### Bước 4: Environment Variables

Thêm các biến môi trường:

```env
VITE_API_URL=https://your-backend-url.com/api
VITE_APP_URL=https://your-app.vercel.app
```

### Bước 5: Deploy

Click "Deploy" và chờ Vercel build.

## 🔧 Deploy Backend

### Option 1: Railway

1. Truy cập: https://railway.app
2. New Project → Deploy from GitHub
3. Chọn repository
4. Cấu hình:
   - **Root Directory**: `apps/backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. Add PostgreSQL database
6. Cấu hình Environment Variables

### Option 2: Render

1. Truy cập: https://render.com
2. New → Web Service
3. Connect repository
4. Cấu hình:
   - **Root Directory**: `apps/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. Add PostgreSQL database
6. Cấu hình Environment Variables

## 📝 Environment Variables cho Backend

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# JWT
SECRET_KEY=your-secret-key-here

# CORS (add Vercel domain)
ALLOWED_ORIGINS=https://your-app.vercel.app

# Frontend URL
FRONTEND_URL=https://your-app.vercel.app
FRONTEND_OAUTH_REDIRECT=https://your-app.vercel.app/oauth/callback
FRONTEND_VERIFY_URL=https://your-app.vercel.app/verify?token={token}

# VNPay (update with production credentials)
VNPAY_TMN_CODE=your_production_tmn_code
VNPAY_HASH_SECRET=your_production_hash_secret
VNPAY_URL=https://vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://your-backend-url.com/api/payment/vnpay/callback

# Momo (update with production credentials)
MOMO_PARTNER_CODE=your_production_partner_code
MOMO_ACCESS_KEY=your_production_access_key
MOMO_SECRET_KEY=your_production_secret_key
MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create
MOMO_RETURN_URL=https://your-backend-url.com/api/payment/momo/callback
MOMO_IPN_URL=https://your-backend-url.com/api/payment/momo/ipn

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SSL=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-backend-url.com/api/auth/google/callback
```

## 🔄 Update Frontend với Backend URL

Sau khi deploy backend, cập nhật frontend:

### 1. Update vercel.json
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-actual-backend-url.com/api/:path*"
    }
  ]
}
```

### 2. Update Environment Variables trong Vercel
```env
VITE_API_URL=https://your-actual-backend-url.com/api
```

### 3. Redeploy
Vercel sẽ tự động redeploy khi bạn push code mới.

## 🗄️ Database Migration

### Chạy migrations trên production database:

```bash
# Connect to production database
psql postgresql://user:password@host:port/dbname

# Run migration scripts
\i db/init/001_initial_schema.sql
\i db/init/002_add_columns.sql
\i db/init/003_payment_system.sql
\i db/init/004_add_level_to_milestones.sql
```

## ✅ Verification Checklist

### Frontend
- [ ] Vercel deployment successful
- [ ] Custom domain configured (optional)
- [ ] Environment variables set
- [ ] API calls working
- [ ] Payment flow working

### Backend
- [ ] Railway/Render deployment successful
- [ ] Database connected
- [ ] Environment variables set
- [ ] API endpoints responding
- [ ] CORS configured correctly

### Database
- [ ] PostgreSQL instance running
- [ ] Migrations executed
- [ ] Seed data loaded
- [ ] Backups configured

### Payment
- [ ] VNPay production credentials
- [ ] Momo production credentials
- [ ] Callback URLs updated
- [ ] Test transactions successful

## 🔐 Security Checklist

- [ ] Change all default passwords
- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Use production payment credentials
- [ ] Enable rate limiting
- [ ] Setup monitoring & logging
- [ ] Configure firewall rules

## 📊 Monitoring

### Vercel
- Analytics: https://vercel.com/dashboard/analytics
- Logs: https://vercel.com/dashboard/deployments

### Backend
- Railway: https://railway.app/dashboard
- Render: https://dashboard.render.com

## 🐛 Troubleshooting

### Issue 1: API calls failing
**Giải pháp**: Kiểm tra CORS và API URL trong environment variables

### Issue 2: Payment callbacks không hoạt động
**Giải pháp**: Verify callback URLs trong VNPay/Momo dashboard

### Issue 3: Database connection error
**Giải pháp**: Kiểm tra DATABASE_URL và firewall rules

### Issue 4: Build failed
**Giải pháp**: Kiểm tra dependencies và build command

## 📱 Custom Domain (Optional)

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records

### Backend
1. Add custom domain in Railway/Render
2. Update environment variables
3. Update VNPay/Momo callback URLs

## 🎉 Post-Deployment

### 1. Test Everything
- [ ] User registration
- [ ] Login/Logout
- [ ] Assessment
- [ ] Results
- [ ] Roadmap
- [ ] Payment flow
- [ ] Email verification

### 2. Monitor
- Check logs regularly
- Monitor error rates
- Track performance

### 3. Optimize
- Enable caching
- Optimize images
- Minify assets
- Use CDN

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [VNPay API Docs](https://sandbox.vnpayment.vn/apis/docs)
- [Momo API Docs](https://developers.momo.vn)

---

**Ready for Production! 🚀**
