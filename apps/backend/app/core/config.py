import os
from typing import Optional

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    
    # AI Core
    AI_CORE_BASE: str = os.getenv("AI_CORE_BASE", "http://localhost:9000")
    
    # Email
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@career-ai.com")
    
    # Ngrok Domain (for testing payment callbacks)
    NGROK_DOMAIN: str = os.getenv("NGROK_DOMAIN", "")
    PUBLIC_BACKEND_URL: str = os.getenv("PUBLIC_BACKEND_URL", "http://localhost:8000")
    
    # VNPay Configuration
    VNPAY_TMN_CODE: str = os.getenv("VNPAY_TMN_CODE", "")
    VNPAY_HASH_SECRET: str = os.getenv("VNPAY_HASH_SECRET", "")
    VNPAY_URL: str = os.getenv("VNPAY_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
    VNPAY_RETURN_URL: str = os.getenv("VNPAY_RETURN_URL", "")
    
    # Momo Configuration
    MOMO_PARTNER_CODE: str = os.getenv("MOMO_PARTNER_CODE", "")
    MOMO_ACCESS_KEY: str = os.getenv("MOMO_ACCESS_KEY", "")
    MOMO_SECRET_KEY: str = os.getenv("MOMO_SECRET_KEY", "")
    MOMO_ENDPOINT: str = os.getenv("MOMO_ENDPOINT", "https://test-payment.momo.vn/v2/gateway/api/create")
    MOMO_RETURN_URL: str = os.getenv("MOMO_RETURN_URL", "")
    MOMO_IPN_URL: str = os.getenv("MOMO_IPN_URL", "")
    
    # Frontend URL
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")


settings = Settings()
