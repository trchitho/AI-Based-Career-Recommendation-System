"""
Optimized development server runner for Windows.
Prevents socket exhaustion (WinError 10055) by:
1. Using single worker
2. Limiting concurrent connections
3. Proper timeout settings
"""

import uvicorn
import os

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        # CRITICAL: Use single worker on Windows to prevent socket exhaustion
        workers=1,
        # Limit concurrent connections
        limit_concurrency=100,
        # Limit max requests per connection (helps with connection reuse)
        limit_max_requests=1000,
        # Timeout settings
        timeout_keep_alive=30,
        # Use uvloop on Linux/Mac, default on Windows
        loop="auto",
        # Disable access log to reduce I/O
        access_log=False,
        # Reload settings - exclude heavy directories
        reload_dirs=["app"],
        reload_excludes=["*.pyc", "__pycache__", ".venv", "*.log"],
    )
