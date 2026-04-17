#!/usr/bin/env python3
"""
Script to clear rate limit cache
"""
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.rate_limiter import RateLimiter

async def clear_rate_limit():
    """Clear rate limit cache"""
    try:
        print("🧹 Clearing rate limit cache...")
        
        rate_limiter = RateLimiter()
        await rate_limiter.clear_cache()
        
        print("✅ Rate limit cache cleared successfully!")
        
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")

if __name__ == "__main__":
    asyncio.run(clear_rate_limit())